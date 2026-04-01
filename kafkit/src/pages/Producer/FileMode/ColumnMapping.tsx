import { useTranslation } from 'react-i18next';
import { ColumnMapping as ColumnMappingType } from './types';

interface ColumnMappingProps {
  headers: string[];
  mapping: ColumnMappingType;
  onChange: (mapping: ColumnMappingType) => void;
  disabled?: boolean;
}

export function ColumnMapping({ headers, mapping, onChange, disabled }: ColumnMappingProps) {
  const { t } = useTranslation();

  const handleChange = (field: keyof ColumnMappingType, value: string) => {
    onChange({ ...mapping, [field]: value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Key Column */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t('producer.fileMode.mapping.keyColumn')}
        </label>
        <select
          value={mapping.keyColumn}
          onChange={(e) => handleChange('keyColumn', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t('producer.fileMode.mapping.none')}</option>
          {headers.map((header) => (
            <option key={header} value={header}>
              {header}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {t('producer.fileMode.mapping.keyColumnHint')}
        </p>
      </div>

      {/* Value Column */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t('producer.fileMode.mapping.valueColumn')}
        </label>
        <select
          value={mapping.valueColumn}
          onChange={(e) => handleChange('valueColumn', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t('producer.fileMode.mapping.useAllColumns')}</option>
          {headers.map((header) => (
            <option key={header} value={header}>
              {header}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {t('producer.fileMode.mapping.valueColumnHint')}
        </p>
      </div>

      {/* Headers Column */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t('producer.fileMode.mapping.headerColumn')}
        </label>
        <select
          value={mapping.headerColumn}
          onChange={(e) => handleChange('headerColumn', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t('producer.fileMode.mapping.none')}</option>
          {headers.map((header) => (
            <option key={header} value={header}>
              {header}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {t('producer.fileMode.mapping.headerColumnHint')}
        </p>
      </div>

      {/* Partition Column */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t('producer.fileMode.mapping.partitionColumn')}
        </label>
        <select
          value={mapping.partitionColumn}
          onChange={(e) => handleChange('partitionColumn', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t('producer.fileMode.mapping.auto')}</option>
          {headers.map((header) => (
            <option key={header} value={header}>
              {header}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {t('producer.fileMode.mapping.partitionColumnHint')}
        </p>
      </div>
    </div>
  );
}
