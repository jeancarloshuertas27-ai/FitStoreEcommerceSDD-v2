import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  ShoppingBag,
  Check,
  RotateCcw,
  Receipt,
  Copy,
  ExternalLink,
  ChevronDown,
  ArrowRight,
  Package,
  CreditCard,
  Phone,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import fitbotService, {
  QUICK_REPLIES,
  getStoredHistory,
  saveHistory,
  clearHistory,
  processUserMessage,
} from '../services/fitbotService.js';

export default function FitBotModal({ products = [], storeSettings = {} }) {
  const { addToCart } = useCart();

  // Estados de interfaz del widget
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [messages, setMessages] = useState(() => getStoredHistory());
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Estado para feedback temporal "¡Agregado!" por producto
  const [addedProductIds, setAddedProductIds] = useState({});

  // Estado para feedback de copia al portapapeles
  const [copiedField, setCopiedField] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll al final del chat ante nuevos mensajes o animación de tipeo
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  // Persistir en sessionStorage cada vez que cambien los mensajes
  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  // Cerrar tooltip de bienvenida después de 8 segundos si no se ha interactuado
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 9000);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenChat = () => {
    setIsOpen(true);
    setShowTooltip(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
  };

  const handleCloseChat = () => {
    setIsOpen(false);
  };

  const handleResetChat = () => {
    const fresh = clearHistory();
    setMessages(fresh);
  };

  const handleCopyText = (text, fieldKey) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(''), 2000);
  };

  // Enviar mensaje del usuario y procesar respuesta con retardo humanizado (400ms)
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isTyping) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
    };

    // Añadir mensaje del usuario inmediatamente
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Retardo humanizado de escritura (400ms)
      const [botResponse] = await Promise.all([
        processUserMessage(text, products, storeSettings),
        new Promise((resolve) => setTimeout(resolve, 400)),
      ]);

      setMessages((prev) => [...prev, botResponse]);
    } catch (err) {
      console.error('Error procesando respuesta en FitBot:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: 'Disculpa, tuve un inconveniente al consultar la información. Por favor inténtalo nuevamente.',
          timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
          type: 'text',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Manejo de la acción "+ Agregar al Carrito" en tarjetas del chat
  const handleAddProductFromChat = (product) => {
    if (!product || product.stock <= 0) return;

    addToCart(product, 1);

    // Feedback visual "✓ ¡Agregado!" durante 1.8s
    setAddedProductIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedProductIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1800);
  };

  return (
    <>
      {/* --------------------------------------------------------------------- */}
      {/* 1. BOTÓN FLOTANTE EN ESQUINA INFERIOR DERECHA (z-40) */}
      {/* --------------------------------------------------------------------- */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
        {/* Globo de Bienvenida Flotante */}
        {!isOpen && showTooltip && (
          <div className="mb-3 mr-1 bg-slate-900 text-white text-xs p-3.5 rounded-2xl border border-orange-500/40 shadow-2xl max-w-xs animate-bounce relative">
            <button
              onClick={() => setShowTooltip(false)}
              className="absolute -top-1.5 -right-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-full p-0.5 border border-slate-700"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <strong className="text-orange-400 font-bold">FitBot en línea</strong>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed cursor-pointer" onClick={handleOpenChat}>
              ¿Buscas suplementos o quieres consultar tu pedido? ¡Haz clic aquí para asesorarte!
            </p>
          </div>
        )}

        {/* Botón Circular Flotante */}
        {!isOpen && (
          <button
            onClick={handleOpenChat}
            className="group relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-orange-500 text-white shadow-xl shadow-orange-600/30 hover:shadow-orange-500/50 hover:scale-105 active:scale-95 transition-all duration-200 border border-orange-400/40"
            title="Abrir FitBot - Asesor Deportivo"
            aria-label="Abrir FitBot"
          >
            <Bot className="w-7 h-7 text-white transform group-hover:rotate-12 transition-transform duration-200" />

            {/* Badge 'En línea' Verde */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-950" />
            </span>
          </button>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 2. VENTANA DE CHAT DE FITBOT */}
      {/* Desktop: Flotante w-[390px] h-[570px] | Móvil: Pantalla completa */}
      {/* --------------------------------------------------------------------- */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-40 sm:w-[400px] sm:h-[580px] sm:max-h-[85vh] bg-slate-900 border border-orange-500/30 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
          {/* Cabecera del Chat */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950/60 p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-600/20">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-white">FitBot</h3>
                  <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                    Coach
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>En línea • Asesor FitStore Pro</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Reiniciar conversación"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handleCloseChat}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Minimizar FitBot"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cuerpo de Mensajes con Scroll Suave */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs no-scrollbar bg-slate-950/40">
            {messages.map((msg) => {
              const isBot = msg.sender === 'bot';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isBot ? 'items-start' : 'items-end'} animate-fadeIn`}
                >
                  {/* Burbuja Principal */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed shadow-sm ${
                      isBot
                        ? 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-sm'
                        : 'bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-tr-sm shadow-orange-600/20'
                    }`}
                  >
                    <div className="whitespace-pre-line text-xs">{msg.text}</div>

                    {/* RENDERIZADO: MINI-TARJETAS DE PRODUCTOS */}
                    {msg.type === 'products' && msg.products && msg.products.length > 0 && (
                      <div className="mt-3 space-y-2.5 pt-2 border-t border-slate-700/60">
                        {msg.products.map((prod) => {
                          const isOutOfStock = prod.stock <= 0;
                          const isAdded = Boolean(addedProductIds[prod.id]);

                          return (
                            <div
                              key={prod.id}
                              className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-700/80 flex items-center justify-between gap-3 shadow-md hover:border-orange-500/40 transition-all"
                            >
                              <img
                                src={prod.image_url}
                                alt={prod.name}
                                className="w-12 h-12 object-cover rounded-lg bg-slate-800 shrink-0 border border-slate-700"
                              />

                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] uppercase font-bold text-orange-400 block truncate">
                                  {prod.category}
                                </span>
                                <h4 className="text-xs font-bold text-white truncate" title={prod.name}>
                                  {prod.name}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-extrabold text-orange-300 text-xs">
                                    S/ {Number(prod.price).toFixed(2)}
                                  </span>
                                  {isOutOfStock ? (
                                    <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-bold">
                                      Agotado
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-400">
                                      Stock: {prod.stock} un.
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() => handleAddProductFromChat(prod)}
                                disabled={isOutOfStock}
                                className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm flex items-center gap-1 ${
                                  isOutOfStock
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : isAdded
                                    ? 'bg-emerald-600 text-white animate-pulse'
                                    : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/30 active:scale-95'
                                }`}
                                title={isOutOfStock ? 'Producto agotado' : 'Añadir al carrito'}
                              >
                                {isAdded ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>¡Agregado!</span>
                                  </>
                                ) : (
                                  <>
                                    <ShoppingBag className="w-3.5 h-3.5" />
                                    <span>+ Carrito</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* RENDERIZADO: RESUMEN DE RASTREO DE ÓRDENES */}
                    {msg.type === 'order_tracking' && msg.orders && msg.orders.length > 0 && (
                      <div className="mt-3 space-y-2.5 pt-2 border-t border-slate-700/60">
                        {msg.orders.map((ord, idx) => {
                          const isEnVerificacion = ord.order_status === 'En Verificación';
                          const isPagado = ord.order_status === 'Pagado / En Preparación';
                          const isEnviado = ord.order_status === 'Enviado';
                          const isEntregado = ord.order_status === 'Entregado';

                          return (
                            <div
                              key={idx}
                              className="bg-slate-900/90 rounded-xl p-3 border border-slate-700/80 space-y-2 shadow-md"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-mono font-bold text-orange-400">
                                  {ord.order_code}
                                </span>
                                <span className="text-slate-400 text-[10px]">
                                  {ord.created_at}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-300">
                                Total: <strong className="text-white">S/ {Number(ord.total).toFixed(2)}</strong> ({ord.payment_method})
                              </div>

                              <div className="text-[10px] text-slate-400 line-clamp-1">
                                {ord.items_summary}
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
                                <span className="text-slate-400">Estado:</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold ${
                                    isEnVerificacion
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      : isPagado
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : isEnviado
                                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                      : isEntregado
                                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                                      : 'bg-rose-500/20 text-rose-400'
                                  }`}
                                >
                                  {ord.order_status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* RENDERIZADO: DATOS DE COBRO DEL PROPIETARIO (store_settings) */}
                    {msg.type === 'payment_info' && msg.paymentData && (
                      <div className="mt-3 space-y-2 pt-2 border-t border-slate-700/60 text-[11px]">
                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                          <div className="text-slate-300 font-semibold flex items-center justify-between">
                            <span>Titular Recaudador:</span>
                            <span className="text-orange-400 font-bold">{msg.paymentData.owner_name}</span>
                          </div>

                          <div className="flex items-center justify-between bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-800">
                            <span>Yape: <strong className="text-purple-400 font-mono">{msg.paymentData.yape_number}</strong></span>
                            <button
                              onClick={() => handleCopyText(msg.paymentData.yape_number, 'yape')}
                              className="text-slate-400 hover:text-white"
                              title="Copiar número de Yape"
                            >
                              {copiedField === 'yape' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="flex items-center justify-between bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-800">
                            <span>Plin: <strong className="text-sky-400 font-mono">{msg.paymentData.plin_number}</strong></span>
                            <button
                              onClick={() => handleCopyText(msg.paymentData.plin_number, 'plin')}
                              className="text-slate-400 hover:text-white"
                              title="Copiar número de Plin"
                            >
                              {copiedField === 'plin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="flex items-center justify-between bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-800">
                            <span>BCP Soles: <strong className="text-white font-mono">{msg.paymentData.bank_account_soles}</strong></span>
                            <button
                              onClick={() => handleCopyText(msg.paymentData.bank_account_soles, 'bcp')}
                              className="text-slate-400 hover:text-white"
                              title="Copiar cuenta BCP"
                            >
                              {copiedField === 'bcp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="flex items-center justify-between bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-800">
                            <span>CCI: <strong className="text-white font-mono text-[10px]">{msg.paymentData.bank_cci}</strong></span>
                            <button
                              onClick={() => handleCopyText(msg.paymentData.bank_cci, 'cci')}
                              className="text-slate-400 hover:text-white"
                              title="Copiar CCI"
                            >
                              {copiedField === 'cci' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-500 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {/* Indicador de Escritura Humanizado (400ms) */}
            {isTyping && (
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[180px] animate-pulse">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">FitBot escribiendo...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Botones de Consulta Rápida (Quick Replies) */}
          <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {QUICK_REPLIES.map((qr) => (
              <button
                key={qr.id}
                onClick={() => handleSendMessage(qr.query)}
                disabled={isTyping}
                className="bg-slate-900 hover:bg-orange-950/60 text-slate-300 hover:text-orange-300 border border-slate-800 hover:border-orange-500/40 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all duration-150 shrink-0 shadow-sm"
              >
                {qr.label}
              </button>
            ))}
          </div>

          {/* Formulario de Entrada de Texto */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              placeholder="Escribe un suplemento, objetivo o DNI..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all shadow-inner"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isTyping}
              className={`p-2 rounded-xl transition-all shadow-md ${
                !inputValue.trim() || isTyping
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white shadow-orange-600/30'
              }`}
              title="Enviar consulta"
              aria-label="Enviar consulta"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

