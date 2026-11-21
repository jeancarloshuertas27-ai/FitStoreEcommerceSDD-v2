import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Upload,
  CreditCard,
  Building2,
  Smartphone,
  Sparkles,
  AlertCircle,
  Lock,
  Loader2,
  ShoppingBag,
  Clock,
} from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import api from '../services/api.js';
import { generateDemoVoucher, generateRandomOperationNumber } from '../utils/voucherGenerator.js';
import { isTrivialOtp } from '../utils/otpRules.js';
import ElectronicReceipt from './ElectronicReceipt.jsx';
import AutoVerifyModal from './AutoVerifyModal.jsx';
import AuthModal from './AuthModal.jsx';

const luhn = (n) => {
  let sum = 0;
  let alt = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = +n[i];
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
};

const isValidExpiry = (expiry) => {
  const match = /^(\d{2})\/(\d{2})$/.exec((expiry || '').trim());
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return year > currentYear || (year === currentYear && month >= currentMonth);
};

const formatCountdown = (totalSeconds) => {
  const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
};

export default function CheckoutModal({ isOpen, onClose, storeSettings, currentUser, onOrderCompleted }) {
  const { items, total: cartSubtotal, totalItems, clearCart } = useCart();

  // Tarifas de envío por departamento/provincia (feature 007)
  const [shippingRates, setShippingRates] = useState([]);
  const [shippingRateId, setShippingRateId] = useState('');
  const selectedRate = shippingRates.find((r) => String(r.id) === String(shippingRateId)) || null;
  const shippingCost = selectedRate ? Number(selectedRate.cost) : 0;
  const total = Number((cartSubtotal + shippingCost).toFixed(2));

  // Paso actual: 1 = Datos del Comprador, 2 = Método de Pago, 3 = Boleta Electrónica
  const [step, setStep] = useState(1);

  // Paso 1: Datos del Comprador
  const [formData, setFormData] = useState({
    name: '',
    dni: '',
    phone: '',
    address: '',
    city: 'Lima',
  });
  const [buyerErrors, setBuyerErrors] = useState({});

  // Paso 2: Método de Pago seleccionado: 'Yape' | 'Plin' | 'Transferencia Bancaria' | 'Tarjeta Crédito/Débito'
  const [paymentMethod, setPaymentMethod] = useState('Yape');

  // Pestaña interna y campos OTP para Yape / Plin
  const [yapePlinTab, setYapePlinTab] = useState('otp');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Modal animado de verificación automática
  const [autoVerifyOpen, setAutoVerifyOpen] = useState(false);
  const [autoVerifyPayload, setAutoVerifyPayload] = useState(null);

  // Referencia CIP y cuenta regresiva de 24h para Transferencia Bancaria
  const [cipReference, setCipReference] = useState('');
  const [cipSecondsLeft, setCipSecondsLeft] = useState(24 * 60 * 60);

  // Campos de Yape / Plin / Transferencia
  const [operationNumber, setOperationNumber] = useState('');
  const [voucherBase64, setVoucherBase64] = useState(null);
  const [voucherFileName, setVoucherFileName] = useState('');

  // Campos de Tarjeta Sandbox
  const [cardData, setCardData] = useState({
    number: '',
    holder: '',
    expiry: '',
    cvv: '',
    installments: '1',
  });
  const [cardErrors, setCardErrors] = useState({});

  // Estados de interfaz y feedback
  const [copiedField, setCopiedField] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Orden creada final para renderizar Boleta Electrónica
  const [completedOrder, setCompletedOrder] = useState(null);

  // Precargar datos del cliente autenticado al abrir
  useEffect(() => {
    if (isOpen && currentUser) {
      setFormData({
        name: currentUser.name || '',
        dni: currentUser.dni || '',
        phone: currentUser.phone || '',
        address: currentUser.address || '',
        city: currentUser.city || 'Lima',
      });
      setStep(1);
      setErrorMessage(null);
      setCompletedOrder(null);
      setYapePlinTab('otp');
      setOtpPhone(currentUser.phone || '');
      setOtpCode('');
      setAutoVerifyOpen(false);
      setAutoVerifyPayload(null);
      setOperationNumber('');
      setVoucherBase64(null);
      setVoucherFileName('');
      setCardErrors({});
      setCardData({
        number: '',
        holder: currentUser.name || '',
        expiry: '',
        cvv: '',
        installments: '1',
      });
    }
  }, [isOpen, currentUser]);

  // Reiniciar pestaña interna y generar CIP cuando cambia el método de pago
  useEffect(() => {
    if (!isOpen) return;
    setYapePlinTab('otp');
    setErrorMessage(null);
    if (paymentMethod === 'Transferencia Bancaria') {
      const ref = 'CIP-2026-' + Math.floor(100000 + Math.random() * 900000);
      setCipReference(ref);
      setCipSecondsLeft(24 * 60 * 60);
    }
  }, [isOpen, paymentMethod]);

  // Temporizador regresivo 24h en vivo para Transferencia Bancaria CIP
  useEffect(() => {
    if (!isOpen || paymentMethod !== 'Transferencia Bancaria') return;
    const interval = setInterval(() => {
      setCipSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, paymentMethod]);

  // Cargar tarifas de envío activas al abrir el Checkout
  useEffect(() => {
    if (!isOpen) return;
    api
      .getShippingRates()
      .then((rates) => {
        setShippingRates(Array.isArray(rates) ? rates : []);
        setShippingRateId((prev) =>
          Array.isArray(rates) && rates.some((r) => String(r.id) === String(prev)) ? prev : ''
        );
      })
      .catch((err) => console.error('Error cargando tarifas de envío:', err));
  }, [isOpen]);

  if (!isOpen) return null;

  if (!currentUser) {
    return (
      <AuthModal
        isOpen={true}
        initialMode="register"
        reasonText="Para finalizar tu compra en FitStore Pro, inicia sesión o crea tu cuenta rápidamente. Tu carrito se mantendrá intacto."
        onClose={onClose}
      />
    );
  }

  // Copiado al portapapeles con feedback visual
  const handleCopy = (text, fieldName) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Validar Paso 1: Datos del Comprador
  const validateStep1 = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'El nombre completo es obligatorio';
    if (!/^\d{8}$/.test(formData.dni.trim())) errors.dni = 'El DNI debe contener exactamente 8 dígitos';
    if (!/^9\d{8}$/.test(formData.phone.trim())) errors.phone = 'El celular debe tener 9 dígitos y comenzar con 9';
    if (!formData.address.trim()) errors.address = 'La dirección de entrega es obligatoria';
    if (!selectedRate) errors.shipping = 'Selecciona tu departamento y provincia de envío';
    setBuyerErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (items.length === 0) {
      setErrorMessage('Tu carrito de compras está vacío. Agrega suplementos antes de continuar.');
      return;
    }
    if (validateStep1()) {
      setStep(2);
      setErrorMessage(null);
    }
  };

  // Generador Demo de OTP válido de 6 dígitos (no trivial, no secuencial, no repetitivo)
  const handleGenerateDemoOtp = () => {
    let code = '';
    do {
      code = String(Math.floor(100000 + Math.random() * 900000));
    } while (isTrivialOtp(code));
    setOtpCode(code);
    setErrorMessage(null);
  };

  // Generador Demo de N° de Operación en 1 clic
  const handleGenerateDemoOp = () => {
    const prefix = paymentMethod === 'Yape' ? 'OP' : paymentMethod === 'Plin' ? 'PLIN' : 'BCP';
    const num = generateRandomOperationNumber(prefix);
    setOperationNumber(num);
  };

  // Generador Demo de Voucher en 1 clic (Canvas)
  const handleLoadDemoVoucher = () => {
    let currentOp = operationNumber;
    if (!currentOp) {
      currentOp = generateRandomOperationNumber(paymentMethod === 'Yape' ? 'OP' : paymentMethod === 'Plin' ? 'PLIN' : 'BCP');
      setOperationNumber(currentOp);
    }

    const demoDataUri = generateDemoVoucher({
      method: paymentMethod === 'Transferencia Bancaria' ? 'CIP' : paymentMethod,
      amount: total,
      operationNumber: currentOp,
      ownerName: 'FitStore Pro',
      destination: cipReference || 'CIP-FITSTORE',
    });

    setVoucherBase64(demoDataUri);
    setVoucherFileName(`voucher_demo_${paymentMethod.toLowerCase()}_${Date.now()}.png`);
  };

  // Manejo de archivo manual de comprobante con validación < 5MB
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor sube un archivo de imagen válido (.png, .jpg, .jpeg).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('La imagen del voucher no puede superar los 5 MB. Puedes usar el botón "Cargar Voucher de Prueba".');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setVoucherBase64(reader.result);
      setVoucherFileName(file.name);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  // Autocompletar Tarjeta Sandbox (4242...) en 1 clic
  const handleAutofillSandboxCard = () => {
    setCardData({
      number: '4242 4242 4242 4242',
      holder: formData.name || 'TITULAR DE PRUEBA',
      expiry: '12/28',
      cvv: '123',
      installments: '1',
    });
    setCardErrors({});
  };

  // Formateador de tarjeta en tiempo real
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardData({ ...cardData, number: formatted });
    if (cardErrors.number) {
      setCardErrors((prev) => ({ ...prev, number: undefined }));
    }
  };

  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2);
    }
    setCardData({ ...cardData, expiry: raw });
    if (cardErrors.expiry) {
      setCardErrors((prev) => ({ ...prev, expiry: undefined }));
    }
  };

  const buildOrderBasePayload = () => ({
    user_id: currentUser?.id,
    shipping_rate_id: selectedRate?.id,
    customer: {
      name: formData.name.trim(),
      dni: formData.dni.trim(),
      phone: formData.phone.trim(),
      address: `${formData.address.trim()}, ${selectedRate?.province || formData.city}`,
    },
    items: items.map((it) => ({
      product_id: it.id,
      product_name: it.name,
      quantity: it.quantity,
      unit_price: it.price,
      subtotal: Number((it.price * it.quantity).toFixed(2)),
    })),
    total,
  });

  // Callback de éxito del Modal de Verificación Automática
  const handleAutoVerifySuccess = (result) => {
    setAutoVerifyOpen(false);
    setAutoVerifyPayload(null);
    clearCart();

    const fullOrder = {
      ...(result?.order || result),
      id: result?.order?.id || result?.order_id,
      order_code: result?.order?.order_code || result?.order_code,
      customer_name: result?.order?.customer_name || formData.name.trim(),
      customer_dni: result?.order?.customer_dni || formData.dni.trim(),
      customer_phone: result?.order?.customer_phone || formData.phone.trim(),
      shipping_address: result?.order?.shipping_address || `${formData.address.trim()}, ${formData.city}`,
      total: result?.order?.total ?? total,
      order_status: result?.order?.order_status || 'Pagado / En Preparación',
      created_at: result?.order?.created_at || new Date().toISOString(),
      items:
        result?.order?.items ||
        result?.items ||
        items.map((it) => ({
          product_id: it.id,
          product_name: it.name,
          quantity: it.quantity,
          unit_price: it.price,
          subtotal: it.price * it.quantity,
        })),
      payment: result?.order?.payment || result?.payment || {},
    };

    setCompletedOrder(fullOrder);
    setStep(3);
    if (onOrderCompleted) onOrderCompleted(fullOrder);
  };

  // Callback de error del Modal de Verificación Automática (mantiene checkout abierto)
  const handleAutoVerifyError = (msg) => {
    setAutoVerifyOpen(false);
    setErrorMessage(msg || 'No se pudo verificar el pago. Revisa los datos e intenta nuevamente.');
  };

  // Disparo Yape / Plin Tab 1: Código de Aprobación (OTP)
  const handleYapePlinOtpSubmit = () => {
    setErrorMessage(null);
    if (items.length === 0) {
      setErrorMessage('El carrito no contiene productos.');
      return;
    }
    if (!/^9\d{8}$/.test(otpPhone.trim())) {
      setErrorMessage('Ingresa tu número celular de 9 dígitos (debe comenzar con 9) registrado en Yape/Plin.');
      return;
    }
    if (!/^\d{6}$/.test(otpCode.trim()) || isTrivialOtp(otpCode)) {
      setErrorMessage('Ingresa un Código de Aprobación OTP legítimo de 6 dígitos (no 000000, 123456 ni secuencias repetidas).');
      return;
    }

    const base = buildOrderBasePayload();
    setAutoVerifyPayload({
      modalMethod: 'yape_plin',
      requestData: {
        ...base,
        method: 'yape_plin',
        mode: 'otp',
        verification_mode: 'otp',
        sub_method: paymentMethod === 'Plin' ? 'plin' : 'yape',
        phone: otpPhone.trim(),
        otp_code: otpCode.trim(),
      },
    });
    setAutoVerifyOpen(true);
  };

  // Disparo Yape / Plin Tab 2: Escanear QR + N° Operación
  const handleYapePlinQrSubmit = () => {
    setErrorMessage(null);
    if (items.length === 0) {
      setErrorMessage('El carrito no contiene productos.');
      return;
    }
    if (!operationNumber.trim()) {
      setErrorMessage('Por favor ingresa o genera el Número de Operación de tu pago.');
      return;
    }

    const base = buildOrderBasePayload();
    setAutoVerifyPayload({
      modalMethod: 'yape_plin',
      requestData: {
        ...base,
        method: 'yape_plin',
        mode: 'qr',
        verification_mode: 'qr',
        sub_method: paymentMethod === 'Plin' ? 'plin' : 'yape',
        operation_number: operationNumber.trim(),
        voucher_image: voucherBase64 || null,
      },
    });
    setAutoVerifyOpen(true);
  };

  // Mercado Pago Checkout Pro (Sandbox): crea preferencia y redirige a sandbox_init_point
  const handleMercadoPagoSubmit = async () => {
    setErrorMessage(null);
    if (items.length === 0) {
      setErrorMessage('El carrito no contiene productos.');
      return;
    }
    if (!selectedRate) {
      setErrorMessage('Selecciona tu departamento y provincia de envío antes de pagar.');
      return;
    }
    setIsSubmitting(true);
    try {
      const base = buildOrderBasePayload();
      const pref = await api.createMercadoPagoPreference({ ...base, return_url: window.location.origin });
      const target = pref.sandbox_init_point || pref.init_point;
      if (!target) throw new Error('Mercado Pago no devolvió el enlace de pago.');
      window.location.href = target;
    } catch (err) {
      setErrorMessage(err?.message || 'No se pudo iniciar el pago con Mercado Pago.');
      setIsSubmitting(false);
    }
  };

  // Confirmar y Procesar Pago (Transferencia Bancaria y Tarjeta)
  const handleSubmitPayment = () => {
    setErrorMessage(null);

    if (paymentMethod === 'Mercado Pago') {
      handleMercadoPagoSubmit();
      return;
    }

    if (items.length === 0) {
      setErrorMessage('El carrito no contiene productos.');
      return;
    }

    const base = buildOrderBasePayload();

    if (paymentMethod === 'Tarjeta Crédito/Débito') {
      const cardNumClean = cardData.number.replace(/\s/g, '');
      const errs = {};
      if (cardNumClean.length !== 16) {
        errs.number = 'La tarjeta debe tener 16 dígitos';
      } else if (!luhn(cardNumClean)) {
        errs.number = 'Número de tarjeta inválido (Luhn)';
      }
      if (!cardData.holder.trim()) errs.holder = 'Ingresa el nombre del titular';
      if (!isValidExpiry(cardData.expiry)) {
        errs.expiry = 'Fecha inválida o expirada (MM/AA)';
      }
      if (cardData.cvv.length < 3) errs.cvv = 'CVV de 3 o 4 dígitos requerido';

      if (Object.keys(errs).length > 0) {
        setCardErrors(errs);
        return;
      }

      setAutoVerifyPayload({
        modalMethod: 'credit_card',
        requestData: {
          ...base,
          method: 'credit_card',
          card_number: cardNumClean,
          card_expiry: cardData.expiry.trim(),
          card_cvv: cardData.cvv.trim(),
          card_holder: cardData.holder.trim(),
          card_last4: cardNumClean.slice(-4),
          installments: cardData.installments,
        },
      });
      setAutoVerifyOpen(true);
      return;
    }

    if (paymentMethod === 'Transferencia Bancaria') {
      if (!operationNumber.trim()) {
        setErrorMessage('Por favor ingresa o genera el Número de Operación Bancaria.');
        return;
      }

      setAutoVerifyPayload({
        modalMethod: 'bank_transfer',
        requestData: {
          ...base,
          method: 'bank_transfer',
          action: 'verify',
          operation_number: operationNumber.trim(),
          cip_reference: cipReference,
          cip_code: cipReference,
          voucher_image: voucherBase64 || null,
        },
      });
      setAutoVerifyOpen(true);
      return;
    }

    // Fallback en caso se invoque sobre Yape/Plin
    if (yapePlinTab === 'otp') {
      handleYapePlinOtpSubmit();
    } else {
      handleYapePlinQrSubmit();
    }
  };

  // Reservar pedido con Código CIP de 24 horas para confirmar abono luego desde la boleta
  const handleReserveCip = async () => {
    setErrorMessage(null);
    if (items.length === 0) {
      setErrorMessage('El carrito no contiene productos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const base = buildOrderBasePayload();
      const result = await api.autoVerifyPayment({
        ...base,
        method: 'bank_transfer',
        action: 'reserve_cip',
        cip_reference: cipReference,
        cip_code: cipReference,
      });

      clearCart();
      const fullOrder = {
        ...(result?.order || result),
        id: result?.order?.id || result?.order_id,
        order_code: result?.order?.order_code || result?.order_code,
        items: result?.order?.items || result?.items || base.items,
        payment: result?.order?.payment || result?.payment || {},
      };
      setCompletedOrder(fullOrder);
      setStep(3);
      if (onOrderCompleted) onOrderCompleted(fullOrder);
    } catch (err) {
      setErrorMessage(err?.message || 'No se pudo generar la reserva CIP de 24 horas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Si estamos en Paso 3, renderizamos la Boleta Electrónica
  if (step === 3 && completedOrder) {
    return (
      <ElectronicReceipt
        order={completedOrder}
        onClose={onClose}
        onOrderUpdated={(updatedOrder) => {
          setCompletedOrder(updatedOrder);
          if (onOrderCompleted) onOrderCompleted(updatedOrder);
        }}
        onGoToOrders={() => {
          onClose();
          window.location.hash = '#profile';
        }}
        onContinueShopping={() => {
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Encabezado del Modal con Stepper */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                Checkout FitStore Pro
                <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-bold">
                  Pasarela de Pago Segura
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Paso {step} de 2: {step === 1 ? 'Datos de Entrega y Comprador' : 'Selección del Canal de Pago'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Indicador de Pasos */}
            <div className="hidden sm:flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 1 ? 'bg-orange-600 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                1
              </div>
              <div className="w-6 h-0.5 bg-slate-800" />
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 2 ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                2
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mensaje de error general si ocurre */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Contenido Principal con Scroll */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ===================== PASO 1: DATOS DEL COMPRADOR ===================== */}
          {step === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Datos Personales y Dirección en Perú
                  </span>
                  <span className="text-[11px] text-orange-400 font-semibold">
                    Precargados desde tu cuenta
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nombre */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nombre Completo del Comprador *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej. Juan Pérez Quispe"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 transition-all"
                    />
                    {buyerErrors.name && <p className="text-[11px] text-rose-400 mt-1">{buyerErrors.name}</p>}
                  </div>

                  {/* DNI */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      DNI (8 dígitos) *
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={formData.dni}
                      onChange={(e) => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, '') })}
                      placeholder="72458912"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500 transition-all"
                    />
                    {buyerErrors.dni && <p className="text-[11px] text-rose-400 mt-1">{buyerErrors.dni}</p>}
                  </div>

                  {/* Celular */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Teléfono Móvil (9 dígitos) *
                    </label>
                    <input
                      type="text"
                      maxLength={9}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                      placeholder="987654321"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500 transition-all"
                    />
                    {buyerErrors.phone && <p className="text-[11px] text-rose-400 mt-1">{buyerErrors.phone}</p>}
                  </div>

                  {/* Dirección */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Dirección de Entrega (Calle, Número, Dpto / Referencia) *
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Av. Arequipa 2450, Dpto 402, Miraflores"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 transition-all"
                    />
                    {buyerErrors.address && <p className="text-[11px] text-rose-400 mt-1">{buyerErrors.address}</p>}
                  </div>

                  {/* Departamento / Provincia de envío (tarifas desde shipping_rates) */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Departamento y Provincia de Envío *
                    </label>
                    <select
                      value={shippingRateId}
                      onChange={(e) => {
                        const rate = shippingRates.find((r) => String(r.id) === e.target.value);
                        setShippingRateId(e.target.value);
                        setFormData({ ...formData, city: rate ? rate.province : '' });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 transition-all"
                    >
                      <option value="">Selecciona tu destino de entrega…</option>
                      {shippingRates.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.department} - {r.province} · S/ {Number(r.cost).toFixed(2)} ({r.delivery_days})
                        </option>
                      ))}
                    </select>
                    {shippingRates.length === 0 && (
                      <p className="text-[11px] text-amber-400 mt-1">
                        Envíos no disponibles temporalmente. Contacta a soporte.
                      </p>
                    )}
                    {buyerErrors.shipping && <p className="text-[11px] text-rose-400 mt-1">{buyerErrors.shipping}</p>}
                  </div>
                </div>
              </div>

              {/* Resumen Lateral de Compra */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-white uppercase pb-2 border-b border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-orange-400" />
                      Resumen del Carrito
                    </span>
                    <span className="text-orange-400 font-mono">{totalItems} ítems</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {items.map((it) => (
                      <div key={it.id} className="flex justify-between text-xs py-1 border-b border-slate-900">
                        <div className="pr-2">
                          <p className="font-medium text-slate-200 line-clamp-1">{it.name}</p>
                          <span className="text-[10px] text-slate-400">Cant: {it.quantity}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-300 shrink-0">
                          S/ {(it.price * it.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal:</span>
                      <span className="font-mono text-slate-300">S/ {cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Costo de Envío{selectedRate ? ` (${selectedRate.province})` : ''}:</span>
                      {selectedRate ? (
                        <span className="font-mono text-slate-300 font-bold">S/ {shippingCost.toFixed(2)}</span>
                      ) : (
                        <span className="font-mono text-slate-500">Elige tu provincia</span>
                      )}
                    </div>
                    <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-sm font-bold text-white">
                      <span>Total a Pagar:</span>
                      <span className="text-lg font-black text-orange-400 font-mono">
                        S/ {total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 transition-all"
                >
                  <span>Continuar al Pago</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ===================== PASO 2: SELECCIÓN DEL CANAL DE PAGO ===================== */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Pestañas de Métodos de Pago */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Yape')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'Yape'
                      ? 'bg-purple-900/60 text-purple-200 border border-purple-500 shadow-lg shadow-purple-900/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                  <span>1. Yape</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('Plin')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'Plin'
                      ? 'bg-sky-900/60 text-sky-200 border border-sky-500 shadow-lg shadow-sky-900/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span>2. Plin</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('Transferencia Bancaria')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'Transferencia Bancaria'
                      ? 'bg-blue-900/60 text-blue-200 border border-blue-500 shadow-lg shadow-blue-900/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>3. Transferencia CIP</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('Tarjeta Crédito/Débito')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'Tarjeta Crédito/Débito'
                      ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-500 shadow-lg shadow-emerald-900/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>4. Tarjeta Sandbox</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('Mercado Pago')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'Mercado Pago'
                      ? 'bg-sky-900/60 text-sky-200 border border-sky-400 shadow-lg shadow-sky-900/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>5. Mercado Pago</span>
                </button>
              </div>

              {paymentMethod === 'Mercado Pago' && (
                <div className="space-y-3 bg-slate-950/60 p-5 rounded-3xl border border-sky-500/30">
                  <h3 className="text-sm font-black text-sky-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Mercado Pago Checkout Pro (Sandbox)
                  </h3>
                  <p className="text-xs text-slate-300">
                    Serás redirigido a la pasarela oficial de Mercado Pago para pagar con tarjeta de crédito/débito o
                    billetera habilitada. Al volver, verificaremos tu pago automáticamente y tu pedido pasará a
                    “Pagado / En Preparación”.
                  </p>
                  <div className="flex justify-between text-xs text-slate-400 border-t border-slate-800 pt-2">
                    <span>Total a pagar (incluye envío):</span>
                    <span className="font-mono font-black text-sky-300">S/ {total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* VÍA 1 & 2 UNIFICADAS: PASARELA INTEGRADA YAPE / PLIN (SOLO CELULAR + OTP DE 6 DÍGITOS) */}
              {(paymentMethod === 'Yape' || paymentMethod === 'Plin') && (
                <div
                  className={`space-y-5 bg-slate-950/60 p-5 rounded-3xl border ${
                    paymentMethod === 'Plin' ? 'border-sky-500/30' : 'border-purple-500/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <span
                        className={`text-xs font-bold block uppercase tracking-wider ${
                          paymentMethod === 'Plin' ? 'text-sky-300' : 'text-purple-300'
                        }`}
                      >
                        Pasarela Integrada {paymentMethod} — Verificación Instantánea
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Ingresa el celular de tu billetera {paymentMethod} y tu código de aprobación de 6 dígitos
                      </span>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 w-fit">
                      Verificación Automática 2.5s
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Resumen cifrado del cobro en pasarela */}
                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                          <Lock className="w-4 h-4" />
                          <span>Autorización Sin Exponer Cuentas</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Autoriza tu pago directamente desde tu aplicación <strong className="text-white">{paymentMethod}</strong> ingresando tu número celular y el código de aprobación temporal de 6 dígitos.
                        </p>
                        <div className="bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                          <span className="block text-slate-300 font-semibold">Comercio verificado:</span>
                          <span className="font-mono text-orange-400 font-bold">FITSTORE PRO PERÚ</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                        <span className="text-xs text-slate-300">Total a Pagar:</span>
                        <span
                          className={`text-xl font-black font-mono ${
                            paymentMethod === 'Plin' ? 'text-sky-300' : 'text-teal-300'
                          }`}
                        >
                          S/ {total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Formulario OTP del Comprador (Únicamente Celular 9 dígitos + OTP 6 dígitos) */}
                    <div className="space-y-4 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Tu número celular que va a pagar ({paymentMethod}, 9 dígitos) *
                          </label>
                          <div className="relative">
                            <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              maxLength={9}
                              value={otpPhone}
                              onChange={(e) => setOtpPhone(e.target.value.replace(/\D/g, ''))}
                              placeholder="Ej. 987654321"
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500 transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-semibold text-slate-300">
                              Código de Aprobación OTP (6 dígitos) *
                            </label>
                            <button
                              type="button"
                              onClick={handleGenerateDemoOtp}
                              className="text-[11px] text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 transition-all"
                            >
                              <Sparkles className="w-3 h-3" />
                              Generar OTP Demo
                            </button>
                          </div>
                          <input
                            type="text"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="Ej. 492104"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-purple-500 transition-all"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">
                            Encuéntralo en la sección «Código de aprobación» de tu app {paymentMethod}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleYapePlinOtpSubmit}
                        className={`w-full py-3 px-6 rounded-2xl font-black text-xs sm:text-sm text-white flex items-center justify-center gap-2 shadow-xl transition-all ${
                          paymentMethod === 'Plin'
                            ? 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/30'
                            : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Pagar Ahora S/ {total.toFixed(2)}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* VÍA 3: TRANSFERENCIA CON CÓDIGO CIP 24H */}
              {paymentMethod === 'Transferencia Bancaria' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/60 p-5 rounded-3xl border border-blue-500/30">
                  {/* Bloque de Código CIP */}
                  <div className="space-y-4">
                    <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-blue-300 uppercase tracking-wider block">
                          Transferencia con Código CIP
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Paga desde tu banca móvil o agente autorizado con tu código CIP
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {formatCountdown(cipSecondsLeft)}
                      </span>
                    </div>

                    {/* Bloque Prominente de Código CIP + Temporizador 24h */}
                    <div className="bg-amber-950/25 border border-amber-500/40 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-amber-300">
                          Código de Pago CIP (Vigencia 24h)
                        </span>
                        <span className="text-[11px] font-mono font-bold text-amber-200 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          Expira en {formatCountdown(cipSecondsLeft)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-slate-950/90 px-3.5 py-2.5 rounded-xl border border-amber-500/30">
                        <span className="text-base sm:text-lg font-black font-mono text-amber-300 tracking-wider">
                          {cipReference || 'CIP-2026-000000'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(cipReference, 'cip')}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1 shadow transition-all"
                        >
                          {copiedField === 'cip' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedField === 'cip' ? '¡Copiado!' : 'Copiar CIP'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Guía Pasarela CIP */}
                    <div className="bg-gradient-to-br from-blue-950/80 via-slate-900 to-indigo-950 p-5 rounded-3xl border border-blue-500/30 shadow-xl space-y-3 text-white">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-wider text-orange-400">
                          Pasarela Bancaria Integrada
                        </span>
                        <Building2 className="w-5 h-5 text-blue-300" />
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Selecciona «Pago de Servicios / Empresas» en la app de tu banco, busca <strong className="text-white">FitStore Pro CIP</strong> e ingresa el código generado arriba.
                      </p>
                      <div className="flex justify-between items-center text-xs pt-2 border-t border-white/10">
                        <span className="text-slate-400">Total a Pagar:</span>
                        <span className="text-lg font-black text-orange-400 font-mono">
                          S/ {total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Comprobación de Transferencia */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="pb-2 border-b border-slate-800">
                        <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                          Verificación Interbancaria Automática
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Ingresa el N° de operación bancaria o usa el botón demo
                        </span>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-semibold text-slate-300">
                            Número de Operación Bancaria *
                          </label>
                          <button
                            type="button"
                            onClick={handleGenerateDemoOp}
                            className="text-[11px] text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 transition-all"
                          >
                            <Sparkles className="w-3 h-3" />
                            Generar N° Demo
                          </button>
                        </div>
                        <input
                          type="text"
                          value={operationNumber}
                          onChange={(e) => setOperationNumber(e.target.value)}
                          placeholder="Ej. BCP-729401"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-semibold text-slate-300">
                            Constancia de Transferencia (Opcional)
                          </label>
                          <button
                            type="button"
                            onClick={handleLoadDemoVoucher}
                            className="text-[11px] text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 transition-all"
                          >
                            <Sparkles className="w-3 h-3" />
                            Cargar Comprobante Demo
                          </button>
                        </div>

                        <label className="border-2 border-dashed border-slate-800 hover:border-blue-500/60 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-950/40 hover:bg-blue-950/10 transition-all">
                          <Upload className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-xs font-semibold text-slate-300">
                            {voucherFileName || 'Subir constancia bancaria (.png / .jpg)'}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">Máximo 5 MB</span>
                          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                        </label>
                      </div>

                      {voucherBase64 && (
                        <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img src={voucherBase64} alt="Voucher BCP" className="w-10 h-14 object-cover rounded-lg border border-slate-700" />
                            <div>
                              <span className="text-xs font-bold text-slate-200 block">Comprobante BCP Cargado</span>
                              <span className="text-[10px] text-emerald-400">Listo para conciliación</span>
                            </div>
                          </div>
                          <span className="text-xs text-orange-400 font-mono font-bold">{operationNumber}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={handleReserveCip}
                        disabled={isSubmitting}
                        className="w-full py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Generar Reserva CIP (24h) para pagar luego</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* VÍA 4: TARJETA DE CRÉDITO/DÉBITO SANDBOX (US3 / T014-T015) */}
              {paymentMethod === 'Tarjeta Crédito/Débito' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/60 p-5 rounded-3xl border border-emerald-500/30">
                  {/* Tarjeta Visual 3D */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">
                        Pasarela de Tarjetas Segura
                      </span>
                      <button
                        type="button"
                        onClick={handleAutofillSandboxCard}
                        className="px-3 py-1 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs font-bold flex items-center gap-1.5 border border-emerald-500/40 shadow-sm transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Autocompletar Tarjeta Sandbox (4242...)</span>
                      </button>
                    </div>

                    {/* Tarjeta Visual Simulada */}
                    <div className="bg-gradient-to-tr from-slate-900 via-emerald-950 to-slate-900 p-6 rounded-3xl border border-emerald-500/40 shadow-2xl relative overflow-hidden text-white space-y-5">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />

                      <div className="flex justify-between items-center relative z-10">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                          FitStore Pro Sandbox
                        </span>
                        <CreditCard className="w-6 h-6 text-emerald-300" />
                      </div>

                      <div className="w-10 h-7 rounded bg-amber-400/80 border border-amber-300/60 shadow" />

                      <div className="font-mono text-lg sm:text-xl font-bold tracking-widest text-emerald-200">
                        {cardData.number || '•••• •••• •••• 4242'}
                      </div>

                      <div className="flex justify-between items-end text-xs text-slate-300">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Titular:</span>
                          <span className="font-bold tracking-wide">{cardData.holder || formData.name || 'CLIENTE DEMO'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Vence:</span>
                          <span className="font-mono font-bold">{cardData.expiry || 'MM/AA'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Seguridad de Pasarela 3D Secure */}
                    <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-slate-300 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wide">
                        <Lock className="w-3.5 h-3.5" />
                        Pasarela Encriptada 3D Secure
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-300">
                        Tu transacción está protegida con cifrado TLS y validación bancaria instantánea 3D Secure en FitStore Pro.
                      </p>
                    </div>
                  </div>

                  {/* Formulario de Tarjeta */}
                  <div className="space-y-4">
                    <div className="pb-2 border-b border-slate-800">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                        Datos del Plástico
                      </span>
                      <span className="text-[11px] text-slate-400">Validación Luhn en vivo y autorización 3D Secure (1.5s)</span>
                    </div>

                    {/* Número con validación Luhn en vivo */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Número de Tarjeta (16 dígitos) *
                      </label>
                      <input
                        type="text"
                        value={cardData.number}
                        onChange={handleCardNumberChange}
                        placeholder="4242 4242 4242 4242"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition-all"
                      />
                      {cardData.number.replace(/\s/g, '').length === 16 ? (
                        luhn(cardData.number.replace(/\s/g, '')) ? (
                          <p className="text-[11px] text-emerald-400 mt-1 font-semibold">✓ Número válido</p>
                        ) : (
                          <p className="text-[11px] text-rose-400 mt-1 font-semibold">✗ Número de tarjeta inválido (Luhn)</p>
                        )
                      ) : (
                        cardErrors.number && <p className="text-[11px] text-rose-400 mt-1">{cardErrors.number}</p>
                      )}
                    </div>

                    {/* Titular */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Nombre del Titular (como figura en la tarjeta) *
                      </label>
                      <input
                        type="text"
                        value={cardData.holder}
                        onChange={(e) => setCardData({ ...cardData, holder: e.target.value.toUpperCase() })}
                        placeholder="NOMBRE DEL TITULAR"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all uppercase"
                      />
                      {cardErrors.holder && <p className="text-[11px] text-rose-400 mt-1">{cardErrors.holder}</p>}
                    </div>

                    {/* Vencimiento y CVV */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Vencimiento (MM/AA) *
                        </label>
                        <input
                          type="text"
                          maxLength={5}
                          value={cardData.expiry}
                          onChange={handleExpiryChange}
                          placeholder="12/28"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition-all"
                        />
                        {cardData.expiry.length === 5 ? (
                          isValidExpiry(cardData.expiry) ? (
                            <p className="text-[11px] text-emerald-400 mt-1 font-semibold">✓ Fecha vigente</p>
                          ) : (
                            <p className="text-[11px] text-rose-400 mt-1 font-semibold">✗ Fecha expirada o inválida</p>
                          )
                        ) : (
                          cardErrors.expiry && <p className="text-[11px] text-rose-400 mt-1">{cardErrors.expiry}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          CVV / CVC (3 dígitos) *
                        </label>
                        <input
                          type="password"
                          maxLength={4}
                          value={cardData.cvv}
                          onChange={(e) => {
                            setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '') });
                            if (cardErrors.cvv) {
                              setCardErrors((prev) => ({ ...prev, cvv: undefined }));
                            }
                          }}
                          placeholder="123"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition-all"
                        />
                        {cardData.cvv.length > 0 ? (
                          /^\d{3,4}$/.test(cardData.cvv) ? (
                            <p className="text-[11px] text-emerald-400 mt-1 font-semibold">✓ CVV válido</p>
                          ) : (
                            <p className="text-[11px] text-rose-400 mt-1 font-semibold">✗ Debe tener 3 o 4 dígitos</p>
                          )
                        ) : (
                          cardErrors.cvv && <p className="text-[11px] text-rose-400 mt-1">{cardErrors.cvv}</p>
                        )}
                      </div>
                    </div>

                    {/* Cuotas */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Selector de Cuotas
                      </label>
                      <select
                        value={cardData.installments}
                        onChange={(e) => setCardData({ ...cardData, installments: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all"
                      >
                        <option value="1">1 cuota sin intereses (S/ {total.toFixed(2)})</option>
                        <option value="3">3 cuotas sin intereses (S/ {(total / 3).toFixed(2)}/mes)</option>
                        <option value="6">6 cuotas sin intereses (S/ {(total / 6).toFixed(2)}/mes)</option>
                        <option value="12">12 cuotas sin intereses (S/ {(total / 12).toFixed(2)}/mes)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de Navegación del Paso 2 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver a Datos del Comprador</span>
                </button>

                {(paymentMethod === 'Transferencia Bancaria' ||
                  paymentMethod === 'Tarjeta Crédito/Débito' ||
                  paymentMethod === 'Mercado Pago') && (
                  <button
                    type="button"
                    onClick={handleSubmitPayment}
                    disabled={isSubmitting}
                    className={`py-3 px-6 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl transition-all w-full sm:w-auto ${
                      isSubmitting
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : paymentMethod === 'Tarjeta Crédito/Débito'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                        : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/30'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Procesando Pago Seguro...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          Confirmar y Pagar S/ {total.toFixed(2)}{' '}
                          {paymentMethod === 'Tarjeta Crédito/Débito'
                            ? 'con Tarjeta'
                            : paymentMethod === 'Mercado Pago'
                            ? 'con Mercado Pago'
                            : `vía ${paymentMethod}`}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Animado de Verificación Automática (Feature 004) */}
      <AutoVerifyModal
        isOpen={autoVerifyOpen}
        method={autoVerifyPayload?.modalMethod || 'yape_plin'}
        verifyFn={() =>
          autoVerifyPayload?.modalMethod === 'yape_plin' && autoVerifyPayload?.requestData?.mode === 'otp'
            ? api.payYapePlin(autoVerifyPayload.requestData)
            : api.autoVerifyPayment(autoVerifyPayload?.requestData)
        }
        onSuccess={handleAutoVerifySuccess}
        onError={handleAutoVerifyError}
      />
    </div>
  );
}

