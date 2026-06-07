import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { AuthService } from '../../auth/auth.service';
import { APP_CONFIG } from '../../config/app.tokens';
import {
  EMPTY_LIVE_NOTIFICATIONS,
  LiveNotificationInvalidationEvent,
  LiveNotificationItem,
  LiveNotificationsResponse,
} from './live-notifications.model';

@Injectable({ providedIn: 'root' })
export class ShellNotificationsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly appConfig = inject(APP_CONFIG);

  private readonly snapshotState = signal<LiveNotificationsResponse>(EMPTY_LIVE_NOTIFICATIONS);
  private readonly loadingState = signal(false);
  private readonly errorState = signal(false);
  private readonly connectedState = signal(false);
  private readonly hasConnectedOnceState = signal(false);
  private readonly hasLoadedOnceState = signal(false);
  private readonly hasSnapshotState = signal(false);

  private stompClient: Client | null = null;
  private subscriptions: StompSubscription[] = [];
  private currentConnectionKey: string | null = null;
  private reloadQueued = false;

  readonly items = computed<LiveNotificationItem[]>(() => this.snapshotState().items);
  readonly totalActiveCount = computed(() => this.snapshotState().totalActiveCount);
  readonly loanAttentionCount = computed(() => this.snapshotState().loanAttentionCount);
  readonly isLoading = this.loadingState.asReadonly();
  readonly hasLoadedOnce = this.hasLoadedOnceState.asReadonly();
  readonly hasSnapshot = this.hasSnapshotState.asReadonly();
  readonly initialLoadPending = computed(() => this.loadingState() && !this.hasLoadedOnceState());
  readonly isRefreshing = computed(() => this.loadingState() && this.hasLoadedOnceState());
  readonly hasError = this.errorState.asReadonly();
  readonly isConnected = this.connectedState.asReadonly();
  readonly hasConnectedOnce = this.hasConnectedOnceState.asReadonly();

  constructor() {
    effect(() => {
      const token = this.authService.accessToken();
      const currentUser = this.authService.currentUser();

      if (!token || !currentUser) {
        this.disconnect();
        this.snapshotState.set(EMPTY_LIVE_NOTIFICATIONS);
        this.loadingState.set(false);
        this.errorState.set(false);
        this.connectedState.set(false);
        this.hasConnectedOnceState.set(false);
        this.hasLoadedOnceState.set(false);
        this.hasSnapshotState.set(false);
        return;
      }

      this.ensureConnected(token, currentUser.role);
      void this.reload();
    });
  }

  async reload(): Promise<void> {
    const token = this.authService.accessToken();
    if (!token) {
      this.snapshotState.set(EMPTY_LIVE_NOTIFICATIONS);
      this.hasLoadedOnceState.set(false);
      this.hasSnapshotState.set(false);
      return;
    }

    if (this.loadingState()) {
      this.reloadQueued = true;
      return;
    }

    this.loadingState.set(true);

    try {
      const snapshot = await firstValueFrom(
        this.http.get<LiveNotificationsResponse>(`${this.appConfig.apiUrl}/notifications/live`),
      );
      this.snapshotState.set(snapshot);
      this.hasSnapshotState.set(true);
      this.errorState.set(false);
    } catch {
      this.errorState.set(true);
    } finally {
      this.loadingState.set(false);
      this.hasLoadedOnceState.set(true);
      if (this.reloadQueued) {
        this.reloadQueued = false;
        void this.reload();
      }
    }
  }

  private ensureConnected(token: string, role: string): void {
    const connectionKey = `${token}:${role}`;
    if (this.stompClient && this.currentConnectionKey === connectionKey) {
      return;
    }

    this.disconnect();
    this.currentConnectionKey = connectionKey;

    const stompClient = new Client({
      brokerURL: this.resolveBrokerUrl(),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 15000,
      heartbeatOutgoing: 15000,
      onConnect: () => {
        this.connectedState.set(true);
        this.hasConnectedOnceState.set(true);
        this.errorState.set(false);
        this.subscribeToTopics(stompClient, role === 'Administrador');
        void this.reload();
      },
      onDisconnect: () => {
        this.connectedState.set(false);
      },
      onWebSocketClose: () => {
        this.connectedState.set(false);
      },
      onStompError: () => {
        this.connectedState.set(false);
        this.errorState.set(true);
      },
      onWebSocketError: () => {
        this.connectedState.set(false);
        this.errorState.set(true);
      },
    });

    this.stompClient = stompClient;
    stompClient.activate();
  }

  private subscribeToTopics(stompClient: Client, isAdministrator: boolean): void {
    this.unsubscribeAll();
    this.subscriptions.push(
      stompClient.subscribe('/topic/notifications/global', (message) => this.handleInvalidation(message)),
    );

    if (isAdministrator) {
      this.subscriptions.push(
        stompClient.subscribe('/topic/notifications/admin', (message) => this.handleInvalidation(message)),
      );
    }
  }

  private handleInvalidation(message: IMessage): void {
    try {
      JSON.parse(message.body) as LiveNotificationInvalidationEvent;
    } catch {
      // Si el payload cambia, aún queremos refrescar el snapshot.
    }

    void this.reload();
  }

  private resolveBrokerUrl(): string {
    const apiBaseUrl = this.appConfig.apiUrl.replace(/\/api\/?$/, '');
    if (apiBaseUrl.startsWith('https://')) {
      return apiBaseUrl.replace('https://', 'wss://') + '/ws';
    }

    return apiBaseUrl.replace('http://', 'ws://') + '/ws';
  }

  private disconnect(): void {
    this.unsubscribeAll();
    this.currentConnectionKey = null;

    if (!this.stompClient) {
      return;
    }

    void this.stompClient.deactivate();
    this.stompClient = null;
  }

  private unsubscribeAll(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions = [];
  }
}
