import { Params, Router } from '@angular/router';

export function openInventoryLabelPrint(router: Router, queryParams: Params): void {
  const url = router.serializeUrl(
    router.createUrlTree(['/print/inventory-labels'], { queryParams }),
  );

  window.open(url, '_blank', 'noopener,noreferrer');
}
