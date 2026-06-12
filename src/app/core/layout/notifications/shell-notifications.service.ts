import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { AuthService } from '../../auth/auth.service';
import { APP_CONFIG } from '../../config/app.tokens';
import {
  EMPTY_NOTIFICATIONS_PAGE,
  NotificationFilter,
  NotificationItem,
  LiveNotificationInvalidationEvent,
  NotificationsPageResponse,
} from './notifications.model';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ShellNotificationsService {
  private static readonly PANEL_LIMIT = 5;
  private static readonly DRAWER_LIMIT = 24;

  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly router = inject(Router);

  private readonly panelState = signal<NotificationsPageResponse>(EMPTY_NOTIFICATIONS_PAGE);
  private readonly drawerItemsState = signal<NotificationItem[]>([]);
  private readonly drawerTotalCountState = signal(0);
  private readonly activeFilterState = signal<NotificationFilter>('all');
  private readonly panelOpenState = signal(false);
  private readonly drawerOpenState = signal(false);
  private readonly panelLoadingState = signal(false);
  private readonly drawerLoadingState = signal(false);
  private readonly markAllLoadingState = signal(false);
  private readonly errorState = signal(false);
  private readonly connectedState = signal(false);
  private readonly hasConnectedOnceState = signal(false);
  private readonly hasLoadedOnceState = signal(false);
  private readonly hasPanelDataState = signal(false);

  private stompClient: Client | null = null;
  private subscriptions: StompSubscription[] = [];
  private currentConnectionKey: string | null = null;
  private reloadQueued = false;
  private reloadScheduled = false;
  private drawerHasMoreState = signal(false);

  private readonly navigationEnd = toSignal(
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
    { initialValue: null },
  );

  readonly items = computed<NotificationItem[]>(() => this.panelState().items);
  readonly drawerItems = this.drawerItemsState.asReadonly();
  readonly activeFilter = this.activeFilterState.asReadonly();
  readonly isPanelOpen = this.panelOpenState.asReadonly();
  readonly isDrawerOpen = this.drawerOpenState.asReadonly();
  readonly totalActiveCount = computed(() => this.panelState().totalCount);
  readonly unreadCount = computed(() => this.panelState().unreadCount);
  readonly loanAttentionCount = computed(() => this.panelState().loanAttentionCount);
  readonly isLoading = computed(() => this.panelLoadingState() || this.drawerLoadingState());
  readonly isPanelLoading = this.panelLoadingState.asReadonly();
  readonly isDrawerLoading = this.drawerLoadingState.asReadonly();
  readonly isMarkingAll = this.markAllLoadingState.asReadonly();
  readonly hasLoadedOnce = this.hasLoadedOnceState.asReadonly();
  readonly hasSnapshot = this.hasPanelDataState.asReadonly();
  readonly initialLoadPending = computed(() => this.panelLoadingState() && !this.hasLoadedOnceState());
  readonly isRefreshing = computed(() => this.panelLoadingState() && this.hasLoadedOnceState());
  readonly hasError = this.errorState.asReadonly();
  readonly isConnected = this.connectedState.asReadonly();
  readonly hasConnectedOnce = this.hasConnectedOnceState.asReadonly();
  readonly drawerHasMore = this.drawerHasMoreState.asReadonly();
  readonly panelEmpty = computed(() => this.items().length === 0);
  readonly drawerEmpty = computed(() => this.drawerItemsState().length === 0);

  constructor() {
    effect(() => {
      const token = this.authService.accessToken();
      const currentUser = this.authService.currentUser();
      this.navigationEnd();

      this.panelOpenState.set(false);
      this.drawerOpenState.set(false);

      if (!token || !currentUser) {
        this.disconnect();
        this.panelState.set(EMPTY_NOTIFICATIONS_PAGE);
        this.drawerItemsState.set([]);
        this.drawerTotalCountState.set(0);
        this.panelLoadingState.set(false);
        this.drawerLoadingState.set(false);
        this.markAllLoadingState.set(false);
        this.errorState.set(false);
        this.connectedState.set(false);
        this.hasConnectedOnceState.set(false);
        this.hasLoadedOnceState.set(false);
        this.hasPanelDataState.set(false);
        this.drawerHasMoreState.set(false);
        return;
      }

      this.ensureConnected(token, currentUser.role);
      if (!this.hasLoadedOnceState()) {
        this.queueReload();
      }
    });
  }

  async reload(): Promise<void> {
    const token = this.authService.accessToken();
    if (!token) {
      this.panelState.set(EMPTY_NOTIFICATIONS_PAGE);
      this.drawerItemsState.set([]);
      this.hasLoadedOnceState.set(false);
      this.hasPanelDataState.set(false);
      return;
    }

    if (this.panelLoadingState()) {
      this.reloadQueued = true;
      return;
    }

    this.panelLoadingState.set(true);

    try {
      const snapshot = await this.fetchNotifications(false, this.activeFilterState(), ShellNotificationsService.PANEL_LIMIT, 0);
      this.panelState.set(snapshot);
      this.hasPanelDataState.set(true);
      this.errorState.set(false);
    } catch {
      this.errorState.set(true);
    } finally {
      this.panelLoadingState.set(false);
      this.hasLoadedOnceState.set(true);
      if (this.reloadQueued) {
        this.reloadQueued = false;
        void this.reload();
      }
    }
  }

  async openPanel(): Promise<void> {
    this.panelOpenState.set(true);
    if (!this.hasLoadedOnceState()) {
      await this.reload();
    }
  }

  closePanel(): void {
    this.panelOpenState.set(false);
  }

  async togglePanel(): Promise<void> {
    if (this.panelOpenState()) {
      this.closePanel();
      return;
    }

    await this.openPanel();
  }

  async openDrawer(): Promise<void> {
    this.panelOpenState.set(false);
    this.drawerOpenState.set(true);
    await this.reloadDrawer(true);
  }

  closeDrawer(): void {
    this.drawerOpenState.set(false);
  }

  async setFilter(filterValue: NotificationFilter): Promise<void> {
    if (this.activeFilterState() === filterValue) {
      return;
    }

    this.activeFilterState.set(filterValue);
    await this.reload();
    if (this.drawerOpenState()) {
      await this.reloadDrawer(true);
    }
  }

  async reloadDrawer(reset = false): Promise<void> {
    if (!this.drawerOpenState() && !reset) {
      return;
    }

    if (this.drawerLoadingState()) {
      return;
    }

    this.drawerLoadingState.set(true);
    try {
      const offset = reset ? 0 : this.drawerItemsState().length;
      const response = await this.fetchNotifications(
        true,
        this.activeFilterState(),
        ShellNotificationsService.DRAWER_LIMIT,
        offset,
      );

      this.panelState.update((current) => ({
        ...current,
        unreadCount: response.unreadCount,
        loanAttentionCount: response.loanAttentionCount,
      }));
      this.drawerTotalCountState.set(response.totalCount);
      this.drawerHasMoreState.set(offset + response.items.length < response.totalCount);
      this.drawerItemsState.set(reset ? response.items : [...this.drawerItemsState(), ...response.items]);
      this.errorState.set(false);
    } catch {
      this.errorState.set(true);
    } finally {
      this.drawerLoadingState.set(false);
    }
  }

  async loadMoreDrawer(): Promise<void> {
    if (!this.drawerHasMoreState() || this.drawerLoadingState()) {
      return;
    }

    await this.reloadDrawer(false);
  }

  async markAllAsRead(): Promise<void> {
    if (this.markAllLoadingState()) {
      return;
    }

    this.markAllLoadingState.set(true);
    try {
      await firstValueFrom(
        this.http.post<void>(
          `${this.appConfig.apiUrl}/notifications/read-all?filter=${this.activeFilterState()}&includeResolved=${this.drawerOpenState()}`,
          {},
        ),
      );
      await this.reload();
      if (this.drawerOpenState()) {
        await this.reloadDrawer(true);
      }
    } finally {
      this.markAllLoadingState.set(false);
    }
  }

  async openNotification(item: NotificationItem): Promise<void> {
    try {
      await this.markAsRead(item);
    } catch {
      // Si el marcado falla, priorizamos que la navegación del usuario no se bloquee.
    }
    this.closePanel();
    this.closeDrawer();
    await this.router.navigateByUrl(item.route);
  }

  async markAsRead(item: NotificationItem): Promise<void> {
    if (item.read) {
      return;
    }

    this.markNotificationReadLocally(item.id);
    try {
      await firstValueFrom(this.http.post<void>(`${this.appConfig.apiUrl}/notifications/${item.id}/read`, {}));
    } catch {
      await this.reload();
      if (this.drawerOpenState()) {
        await this.reloadDrawer(true);
      }
      throw new Error('No se pudo marcar la notificación como leída.');
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
        this.queueReload();
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

    this.queueReload();
  }

  private queueReload(): void {
    if (this.reloadScheduled) {
      return;
    }

    this.reloadScheduled = true;
    setTimeout(() => {
      this.reloadScheduled = false;
      void this.reload();
      if (this.drawerOpenState()) {
        void this.reloadDrawer(true);
      }
    }, 250);
  }

  private async fetchNotifications(
      includeResolved: boolean,
      filterValue: NotificationFilter,
      limit: number,
      offset: number,
  ): Promise<NotificationsPageResponse> {
    return firstValueFrom(
      this.http.get<NotificationsPageResponse>(
        `${this.appConfig.apiUrl}/notifications?filter=${filterValue}&limit=${limit}&offset=${offset}&includeResolved=${includeResolved}`,
      ),
    );
  }

  private markNotificationReadLocally(notificationId: string): void {
    this.panelState.update((current) => ({
      ...current,
      unreadCount: Math.max(0, current.unreadCount - 1),
      items: current.items.map((item) => (item.id === notificationId ? { ...item, read: true } : item)),
    }));

    this.drawerItemsState.update((items) =>
      items.map((item) => (item.id === notificationId ? { ...item, read: true } : item)),
    );
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
