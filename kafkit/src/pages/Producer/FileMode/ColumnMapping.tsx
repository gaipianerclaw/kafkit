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

      {/* Partition Strategy */}
      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-medium">
          {t('producer.fileMode.mapping.partitionStrategy', '分区策略')}
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="key-hash"
              checked={mapping.partitionStrategy === 'key-hash'}
              onChange={(e) => handleChange('partitionStrategy', e.target.value)}
              disabled={disabled}
              className="w-4 h-4"
            />
            <span className="text-sm">{t('producer.fileMode.mapping.keyHash', '基于 Key (保证相同 Key 的顺序)')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="roundrobin"
              checked={mapping.partitionStrategy === 'roundrobin'}
              onChange={(e) => handleChange('partitionStrategy', e.target.value)}
              disabled={disabled}
              className="w-4 h-4"
            />
            <span className="text-sm">{t('producer.fileMode.mapping.roundrobin', '轮询 (均匀分布)')}</span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('producer.fileMode.mapping.partitionStrategyHint', '选择消息分区分配策略。基于 Key 可保证相同 Key 的消息顺序；轮询可实现均匀分布。')}
        </p>
      </div>
    </div>
  );
}
