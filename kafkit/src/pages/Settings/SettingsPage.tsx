import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { Globe, Moon, Sun, Monitor, Info } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SchemaRegistryList } from '../../components/SchemaRegistryList';

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const languages = [
    { code: 'zh-CN', label: '简体中文' },
    { code: 'en-US', label: 'English' },
  ];

  const themes = [
    { value: 'light' as const, label: t('settings.theme.light'), icon: Sun },
    { value: 'dark' as const, label: t('settings.theme.dark'), icon: Moon },
    { value: 'system' as const, label: t('settings.theme.system'), icon: Monitor },
  ];

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  return (
    <div className="flex-1 h-full p-6 overflow-auto min-h-0">
      <h1 className="text-2xl font-bold mb-6">{t('settings.title')}</h1>

      <div className="max-w-2xl space-y-6">
        {/* Language */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-medium">{t('settings.language')}</h2>
          </div>
          <div className="flex gap-3">
            {languages.map((lang) => (
              <Button
                key={lang.code}
                variant={i18n.language === lang.code ? 'primary' : 'outline'}
                size="sm"
                onClick={() => changeLanguage(lang.code)}
              >
                {lang.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Moon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-medium">{t('settings.theme.title')}</h2>
          </div>
          <div className="flex gap-3">
            {themes.map((t) => {
              const Icon = t.icon;
              return (
                <Button
                  key={t.value}
                  variant={theme === t.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setTheme(t.value)}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Schema Registry */}
        <div className="bg-card border border-border rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
          <SchemaRegistryList />
        </div>

        {/* About */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-medium">{t('settings.about')}</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('settings.version')}</span>
              <span className="font-mono">1.0.6</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('settings.kafkaClient')}</span>
              <span className="font-mono">rdkafka</span>
            </div>
            <p className="text-muted-foreground mt-4">
              {t('settings.appDescription')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
