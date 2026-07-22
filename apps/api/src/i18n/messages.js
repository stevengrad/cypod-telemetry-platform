// cypod-telemetry
const messages = {
  en: {
    healthOk: 'Service is healthy.', registered: 'Account created successfully.', loggedIn: 'Signed in successfully.',
    invalidCredentials: 'The email or password is incorrect.', emailExists: 'An account already exists for this email.',
    unauthorized: 'A valid, unexpired access token is required.', forbidden: 'You do not have access to this resource.',
    notFound: 'The requested resource was not found.', routeNotFound: 'The requested endpoint does not exist.',
    validationFailed: 'Please check the submitted values.', deviceCreated: 'Device added to your fleet.', devicesCreated: 'Selected devices were added to your fleet.',
    deviceExists: 'This device is already registered.', catalogDeviceUnavailable: 'This inventory device is not available for assignment.',
    deviceNotInInventory: 'This device was not found in your inventory.', telemetryStored: 'Telemetry stored successfully.',
    duplicateIgnored: 'This telemetry event was already received and was ignored safely.', telemetryRateLimited: 'This device exceeded 10 live readings per minute.',
    backfillRateLimited: 'Too many backfill batches were submitted. Try again shortly.', backfillRequired: 'Buffered readings must use the backfill batch endpoint.',
    invalidBackfill: 'Backfill batches may only contain historical readings.', batchTooLarge: 'The backfill batch is too large.',
    batteryInvalid: 'Battery must be a number from 0 to 100.', temperatureInvalid: 'Temperature must be a number from -50 to 100.',
    gpsInvalid: 'Latitude and longitude are required and must be valid coordinates.', statusInvalid: 'Status must be OK, WARN, FAULT, or OFFLINE.',
    timestampInvalid: 'Timestamp must be a valid ISO date and cannot be too far in the future.', payloadInvalid: 'The telemetry payload is invalid.',
    invalidDateRange: 'The from date must be before the to date.', internalError: 'The request could not be completed.',
    alertLowBattery: 'Battery is below the safe threshold.', alertHighTemperature: 'Temperature is above the configured ceiling.',
    alertDeviceFault: 'The device reported a fault state.', inventoryProvisioned: 'Demo inventory was prepared for this account.'
  },
  ar: {
    healthOk: 'الخدمة تعمل بصورة سليمة.', registered: 'تم إنشاء الحساب بنجاح.', loggedIn: 'تم تسجيل الدخول بنجاح.',
    invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', emailExists: 'يوجد حساب مسجل بهذا البريد الإلكتروني.',
    unauthorized: 'يلزم رمز دخول صالح وغير منتهي.', forbidden: 'ليس لديك صلاحية للوصول إلى هذا المورد.',
    notFound: 'المورد المطلوب غير موجود.', routeNotFound: 'مسار الخدمة المطلوب غير موجود.',
    validationFailed: 'يرجى مراجعة القيم المُدخلة.', deviceCreated: 'تمت إضافة الجهاز إلى أسطولك.', devicesCreated: 'تمت إضافة الأجهزة المحددة إلى أسطولك.',
    deviceExists: 'هذا الجهاز مسجل بالفعل.', catalogDeviceUnavailable: 'هذا الجهاز غير متاح للإسناد حاليًا.',
    deviceNotInInventory: 'هذا الجهاز غير موجود ضمن مخزونك.', telemetryStored: 'تم حفظ بيانات القياس بنجاح.',
    duplicateIgnored: 'تم استلام هذه القراءة من قبل، لذلك تم تجاهلها بأمان.', telemetryRateLimited: 'تجاوز الجهاز حد 10 قراءات مباشرة في الدقيقة.',
    backfillRateLimited: 'تم إرسال دفعات متأخرة كثيرة. حاول بعد قليل.', backfillRequired: 'يجب إرسال القراءات المخزنة عبر مسار الدفعات المتأخرة.',
    invalidBackfill: 'يجب أن تحتوي دفعة القراءات المتأخرة على قراءات تاريخية فقط.', batchTooLarge: 'دفعة القراءات المتأخرة أكبر من الحد المسموح.',
    batteryInvalid: 'يجب أن تكون البطارية رقمًا من 0 إلى 100.', temperatureInvalid: 'يجب أن تكون الحرارة رقمًا من -50 إلى 100.',
    gpsInvalid: 'خط العرض وخط الطول مطلوبان ويجب أن يكونا صالحين.', statusInvalid: 'يجب أن تكون الحالة OK أو WARN أو FAULT أو OFFLINE.',
    timestampInvalid: 'يجب أن يكون الوقت بصيغة ISO صحيحة وألا يكون متقدمًا كثيرًا.', payloadInvalid: 'بيانات القياس غير صالحة.',
    invalidDateRange: 'يجب أن يكون تاريخ البداية قبل تاريخ النهاية.', internalError: 'تعذر إكمال الطلب.',
    alertLowBattery: 'مستوى البطارية أقل من الحد الآمن.', alertHighTemperature: 'درجة الحرارة أعلى من الحد المحدد.',
    alertDeviceFault: 'أبلغ الجهاز عن حالة عطل.', inventoryProvisioned: 'تم تجهيز مخزون تجريبي لهذا الحساب.'
  },
};

export function t(locale, key) {
  return messages[locale]?.[key] ?? messages.en[key] ?? messages.en.internalError;
}
