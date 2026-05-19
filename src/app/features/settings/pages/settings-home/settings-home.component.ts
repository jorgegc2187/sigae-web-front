import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';
import { InstitutionSettings } from '../../models/institution-settings.model';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-settings-home',
  imports: [ReactiveFormsModule, ActionButtonComponent, FormFieldComponent],
  templateUrl: './settings-home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsHomeComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly notifications = inject(NotificationService);

  readonly logoInput = viewChild<ElementRef<HTMLInputElement>>('logoInput');
  readonly isSubmitting = signal(false);
  readonly isLoading = computed(() =>
    this.settingsService.settingsResource.isLoading() && !this.settingsService.settings(),
  );
  readonly logoPreview = signal<string | null>(null);
  readonly selectedLogoFile = signal<File | null>(null);
  private readonly settingsLoadError = signal<unknown>(null);
  private initialSettings: InstitutionSettings | null = null;

  readonly form = this.fb.group({
    systemName: ['', [Validators.required]],
    address: [''],
    city: [''],
    supportPhone: [''],
    supportEmail: ['', [Validators.required, Validators.email]],
  });

  readonly systemNameError = computed(() => {
    const control = this.form.controls.systemName;
    if (!control.invalid || !(control.touched || control.dirty)) {
      return null;
    }

    if (control.hasError('required')) {
      return 'El nombre de la institución es obligatorio.';
    }

    return null;
  });

  readonly supportEmailError = computed(() => {
    const control = this.form.controls.supportEmail;
    if (!control.invalid || !(control.touched || control.dirty)) {
      return null;
    }

    if (control.hasError('required')) {
      return 'El correo de atención es obligatorio.';
    }

    if (control.hasError('email')) {
      return 'Ingrese un correo electrónico válido.';
    }

    return null;
  });

  constructor() {
    effect(() => {
      const settings = this.settingsService.settings();
      if (!settings) {
        return;
      }

      this.initialSettings = settings;
      this.applySettings(settings);
      this.form.markAsPristine();
      this.form.markAsUntouched();
    });

    effect(() => {
      const error = this.settingsService.settingsResource.error();
      if (!error || error === this.settingsLoadError()) {
        return;
      }

      this.settingsLoadError.set(error);
      this.notifications.error({
        message: 'No se pudo cargar la configuración institucional.',
      });
    });
  }

  triggerLogoSelection(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.logoInput()?.nativeElement.click();
  }

  async onLogoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.notifications.warning({ message: 'Seleccione un archivo de imagen válido.' });
      input.value = '';
      return;
    }

    try {
      const preview = await this.readFileAsDataUrl(file);
      this.selectedLogoFile.set(file);
      this.logoPreview.set(preview);
    } catch {
      this.notifications.error({ message: 'No se pudo cargar la imagen seleccionada.' });
    } finally {
      input.value = '';
    }
  }

  onCancel(): void {
    if (!this.initialSettings || this.isSubmitting()) {
      return;
    }

    this.applySettings(this.initialSettings);
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.notifications.info({ message: 'Se restauraron los cambios pendientes.' });
  }

  async onSubmit(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    try {
      this.isSubmitting.set(true);
      const response = await firstValueFrom(
        this.settingsService.saveInstitutionSettings(
          this.buildSettingsPayload(),
          this.selectedLogoFile(),
        ),
      );
      const savedSettings = this.settingsService.syncSavedSettings(response);

      this.initialSettings = savedSettings;
      this.applySettings(savedSettings);
      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.notifications.success({
        message: 'La configuración institucional se guardó correctamente.',
      });
    } catch {
      this.notifications.error({
        message: 'No se pudo guardar la configuración institucional.',
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private applySettings(settings: InstitutionSettings): void {
    this.form.reset({
      systemName: settings.systemName,
      address: settings.address,
      city: settings.city,
      supportPhone: settings.supportPhone,
      supportEmail: settings.supportEmail,
    });
    this.selectedLogoFile.set(null);
    this.logoPreview.set(settings.institutionLogoUrl);
  }

  private buildSettingsPayload(): Omit<InstitutionSettings, 'institutionLogoUrl'> {
    const value = this.form.getRawValue();
    return {
      systemName: value.systemName.trim(),
      address: value.address.trim(),
      city: value.city.trim(),
      supportPhone: value.supportPhone.trim(),
      supportEmail: value.supportEmail.trim(),
    };
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
