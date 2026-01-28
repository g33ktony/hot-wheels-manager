import { useState } from 'react';
import Button from '@/components/common/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { X, Save } from 'lucide-react';

interface CustomerEditFormProps {
  customer: any;
  onCancel: () => void;
  onSave: (customer: any) => void;
  onChange: (customer: any) => void;
}

export default function CustomerEditForm({
  customer,
  onCancel,
  onSave,
  onChange
}: CustomerEditFormProps) {
  const { colors } = useTheme();
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    onChange({
      ...customer,
      [field]: value
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(customer);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nombre */}
        <div>
          <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
            Nombre *
          </label>
          <input
            type="text"
            value={customer.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 border ${colors.border.input} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
            Email
          </label>
          <input
            type="email"
            value={customer.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`w-full px-3 py-2 border ${colors.border.input} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
            Teléfono
          </label>
          <input
            type="tel"
            value={customer.phone || ''}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className={`w-full px-3 py-2 border ${colors.border.input} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>

        {/* Método de contacto */}
        <div>
          <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
            Método de contacto preferido
          </label>
          <select
            value={customer.contactMethod || 'email'}
            onChange={(e) => handleInputChange('contactMethod', e.target.value)}
            className={`w-full px-3 py-2 border ${colors.border.input} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          >
            <option value="email">Email</option>
            <option value="phone">Teléfono</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="facebook">Facebook</option>
          </select>
        </div>
      </div>

      {/* Dirección */}
      <div>
        <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
          Dirección
        </label>
        <input
          type="text"
          value={customer.address || ''}
          onChange={(e) => handleInputChange('address', e.target.value)}
          className={`w-full px-3 py-2 border ${colors.border.input} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        />
      </div>

      {/* Notas */}
      <div>
        <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
          Notas
        </label>
        <textarea
          value={customer.notes || ''}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          className={`w-full px-3 py-2 border ${colors.border.input} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          rows={3}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end pt-4">
        <Button
          type="button"
          variant="secondary"
          icon={<X size={16} />}
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          icon={<Save size={16} />}
          disabled={isSaving}
        >
          {isSaving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
