import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  ShieldCheck, 
  Database
} from 'lucide-react';
import { ClientAccount } from '../types';

interface ClientManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientAccount[];
  activeTenantId: string;
  onSelectTenant: (tenantId: string) => void;
  onSaveClient: (client: ClientAccount) => Promise<void>;
  onDeleteClient: (clientId: string) => Promise<void>;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ClientManagerModal: React.FC<ClientManagerModalProps> = ({
  isOpen,
  onClose,
  clients,
  activeTenantId,
  onSelectTenant,
  onSaveClient,
  onDeleteClient,
  onShowToast
}) => {
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [editingClient, setEditingClient] = useState<ClientAccount | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [clientPin, setClientPin] = useState('');
  const [phone, setPhone] = useState('');
  const [datasetId, setDatasetId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [testMode, setTestMode] = useState(true);
  const [testEventCode, setTestEventCode] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const openNewForm = () => {
    setEditingClient(null);
    setName('');
    const randomSlug = `cliente_${Date.now().toString(36).substring(3, 8)}`;
    setId(randomSlug);
    setClientPin(`pass${Math.floor(1000 + Math.random() * 9000)}`);
    setPhone('');
    setDatasetId('');
    setAccessToken('');
    setTestMode(true);
    setTestEventCode('');
    setNotes('');
    setMode('form');
  };

  const openEditForm = (client: ClientAccount) => {
    setEditingClient(client);
    setName(client.name);
    setId(client.id);
    setClientPin(client.clientPin || '');
    setPhone(client.phone || '');
    setDatasetId(client.metaConfig?.datasetId || '');
    setAccessToken(client.metaConfig?.accessToken || '');
    setTestMode(client.metaConfig?.testMode ?? true);
    setTestEventCode(client.metaConfig?.testEventCode || '');
    setNotes(client.notes || '');
    setMode('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onShowToast('El nombre del cliente es obligatorio', 'error');
      return;
    }
    if (!id.trim()) {
      onShowToast('El identificador del cliente es obligatorio', 'error');
      return;
    }

    setSaving(true);
    try {
      const updatedClient: ClientAccount = {
        id: id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
        name: name.trim(),
        isMaster: editingClient?.isMaster || false,
        clientPin: clientPin.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        metaConfig: {
          datasetId: datasetId.trim(),
          accessToken: accessToken.trim(),
          testMode,
          testEventCode: testEventCode.trim()
        },
        createdAt: editingClient?.createdAt || new Date().toISOString()
      };

      await onSaveClient(updatedClient);
      onShowToast(
        editingClient ? 'Cliente actualizado correctamente' : 'Nuevo cliente conectado con éxito',
        'success'
      );
      setMode('list');
    } catch (err) {
      onShowToast('Error al guardar cliente', 'error');
    } finally {
      setSaving(false);
    }
  };

  const copyAccessInfo = (client: ClientAccount) => {
    const text = `🔐 Accesos al Panel de Meta Ads (${client.name})\nEnlace: ${window.location.origin}\nCódigo PIN de Acceso: ${client.clientPin}\nDataset ID: ${client.metaConfig.datasetId || 'Pendiente'}`;
    navigator.clipboard.writeText(text);
    setCopiedKey(client.id);
    setTimeout(() => setCopiedKey(null), 2500);
    onShowToast('Datos de acceso copiados al portapapeles', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="max-w-2xl w-full bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-600/10 border border-violet-600/20 text-violet-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {mode === 'list' ? 'Gestión Multi-Cliente (SaaS)' : editingClient ? 'Editar Cuenta de Cliente' : 'Conectar Nuevo Cliente'}
              </h2>
              <p className="text-xs text-slate-500">
                {mode === 'list'
                  ? 'Administra tus clientes, asigna Dataset IDs y controla accesos independientes'
                  : 'Configura las credenciales de Meta CAPI y accesos para esta cuenta'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido según el modo */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {mode === 'list' ? (
            <>
              {/* Botón para agregar nuevo cliente */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Cuentas Conectadas ({clients.length + 1})
                </span>
                <button
                  type="button"
                  onClick={openNewForm}
                  className="py-2 px-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-violet-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Conectar Nuevo Cliente</span>
                </button>
              </div>

              {/* Cuenta Maestra Kindev (Protegida) */}
              <div className={`p-4 rounded-2xl border transition-all ${
                activeTenantId === 'kindev'
                  ? 'bg-violet-50/50 border-violet-300 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black text-xs">
                      KD
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900">Kindev S.A.S.</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                          Cuenta Principal
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">Dataset ID: 1368429478371391</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeTenantId === 'kindev' ? (
                      <span className="text-xs font-bold text-violet-600 bg-violet-100/70 px-3 py-1.5 rounded-xl flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Activo
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectTenant('kindev')}
                        className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors"
                      >
                        Cambiar a Kindev
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de Clientes Externos */}
              {clients.length === 0 ? (
                <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
                  <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">No hay clientes externos configurados</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Haz clic en "Conectar Nuevo Cliente" para añadir la cuenta de un cliente con su propio Dataset ID de Meta y clave de acceso privada.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {clients.map((client) => {
                    const isActive = activeTenantId === client.id;
                    return (
                      <div
                        key={client.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isActive
                            ? 'bg-emerald-50/50 border-emerald-300 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center border border-slate-200">
                              {client.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-black text-slate-900">{client.name}</h3>
                                {client.clientPin && (
                                  <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">
                                    PIN: {client.clientPin}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                                <span>Dataset: {client.metaConfig?.datasetId || 'Sin Dataset'}</span>
                                {client.phone && <span>• Tel: {client.phone}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => copyAccessInfo(client)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Copiar accesos para el cliente"
                            >
                              {copiedKey === client.id ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditForm(client)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Editar configuración"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`¿Eliminar la cuenta de ${client.name}?`)) {
                                  onDeleteClient(client.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Eliminar cliente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            {isActive ? (
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Seleccionado
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSelectTenant(client.id)}
                                className="text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors"
                              >
                                Ver Panel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Formulario de Alta / Edición */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre del Negocio / Cliente *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!editingClient && !id) {
                        setId(e.target.value.toLowerCase().trim().replace(/[^a-z0-9]/g, '_'));
                      }
                    }}
                    placeholder="ej. Dr. Jesús Méndez"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Slug / ID de Sistema (Único) *
                  </label>
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="ej. dr_mendez"
                    required
                    disabled={Boolean(editingClient)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    PIN / Clave de Acceso del Cliente *
                  </label>
                  <input
                    type="text"
                    value={clientPin}
                    onChange={(e) => setClientPin(e.target.value)}
                    placeholder="ej. mendez2026"
                    required
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Clave con la que el cliente ingresará directamente a su propio panel.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono WhatsApp (Opcional)
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="ej. 0991234567"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600"
                  />
                </div>
              </div>

              {/* Sección Meta CAPI */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
                  <Database className="w-3.5 h-3.5 text-violet-600" />
                  <span>Credenciales de Meta CAPI (API de Conversiones)</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Meta Dataset ID (Píxel)
                  </label>
                  <input
                    type="text"
                    value={datasetId}
                    onChange={(e) => setDatasetId(e.target.value)}
                    placeholder="ej. 987654321098765"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-violet-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    System User Access Token (Meta Graph API)
                  </label>
                  <textarea
                    rows={2}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="EAAPkg..."
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-violet-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="testModeCheck"
                      checked={testMode}
                      onChange={(e) => setTestMode(e.target.checked)}
                      className="rounded text-violet-600 focus:ring-violet-500"
                    />
                    <label htmlFor="testModeCheck" className="text-xs font-semibold text-slate-700">
                      Activar Modo Prueba (Test Events)
                    </label>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={testEventCode}
                      onChange={(e) => setTestEventCode(e.target.value)}
                      placeholder="Código de prueba (ej. TEST1234)"
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-xl bg-white border border-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas Internas / Campaña
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ej. Campaña activa de $10/día para odontología"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              {/* Botones de acción formulario */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="py-2 px-5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-md shadow-violet-600/20 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : editingClient ? 'Actualizar Cliente' : 'Guardar y Conectar'}
                </button>
              </div>

            </form>
          )}

        </div>

        {/* Pie de modal */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-violet-600" />
            <span>Aislamiento estricto de datos garantizado por Kindev S.A.S.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-slate-700 hover:text-slate-900"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
