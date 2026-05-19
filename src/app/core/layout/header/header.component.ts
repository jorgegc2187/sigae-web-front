import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { APP_CONFIG } from '../../config/app.tokens';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  readonly menuClick = output<void>();
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly appConfig = inject(APP_CONFIG);

  private readonly activeRouteData = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.getDeepestRouteData()),
    ),
    { initialValue: this.getDeepestRouteData() },
  );

  readonly pageTitle = computed(() => this.activeRouteData()?.['pageTitle'] ?? this.appConfig.appName);
  readonly pageSubtitle = computed(() => this.activeRouteData()?.['pageSubtitle'] ?? '');

  onMenuClick() {
    this.menuClick.emit();
  }

  private getDeepestRouteData() {
    let route: ActivatedRoute | null = this.activatedRoute;

    while (route?.firstChild) {
      route = route.firstChild;
    }

    return route?.snapshot?.data ?? {};
  }
}
