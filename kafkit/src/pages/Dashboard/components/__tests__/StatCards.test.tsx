import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { StatCards } from '../StatCards';
import type { DashboardConsumerGroup } from '../../../types/dashboard';

// Mock i18n
i18n.init({
  lng: 'zh-CN',
  resources: {
    'zh-CN': {
      translation: {
        dashboard: {
          stats: {
            totalGroups: '总消费组数',
            healthStatus: '健康状态',
            healthSubtitle: '健康/警告/危险',
            totalLag: '总 Lag 数量',
          },
        },
      },
    },
  },
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
);

describe('StatCards', () => {
  const mockGroups: DashboardConsumerGroup[] = [
    {
      groupId: 'group-1',
      state: 'Stable',
      memberCount: 2,
      coordinator: 1,
      topics: ['topic1'],
      totalLag: 500,
      partitionLags: [],
      healthStatus: 'healthy',
    },
    {
      groupId: 'group-2',
      state: 'Stable',
      memberCount: 3,
      coordinator: 1,
      topics: ['topic2'],
      totalLag: 5000,
      partitionLags: [],
      healthStatus: 'warning',
    },
    {
      groupId: 'group-3',
      state: 'Stable',
      memberCount: 1,
      coordinator: 1,
      topics: ['topic3'],
      totalLag: 15000,
      partitionLags: [],
      healthStatus: 'critical',
    },
  ];

  it('should render all three stat cards', () => {
    render(<StatCards groups={mockGroups} isLoading={false} />, { wrapper: Wrapper });

    expect(screen.getByText('总消费组数')).toBeInTheDocument();
    expect(screen.getByText('健康状态')).toBeInTheDocument();
    expect(screen.getByText('总 Lag 数量')).toBeInTheDocument();
  });

  it('should display correct total groups count', () => {
    render(<StatCards groups={mockGroups} isLoading={false} />, { wrapper: Wrapper });

    expect(screen.getByText('3')).toBeInTheDocument(); // Total groups
  });

  it('should display correct health distribution', () => {
    render(<StatCards groups={mockGroups} isLoading={false} />, { wrapper: Wrapper });

    expect(screen.getByText('1/1/1')).toBeInTheDocument(); // healthy/warning/critical
  });

  it('should display correct total lag', () => {
    render(<StatCards groups={mockGroups} isLoading={false} />, { wrapper: Wrapper });

    // 500 + 5000 + 15000 = 20500 = 20.5K
    expect(screen.getByText('20.5K')).toBeInTheDocument();
  });

  it('should show loading skeleton when isLoading is true', () => {
    render(<StatCards groups={[]} isLoading={true} />, { wrapper: Wrapper });

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should handle empty groups', () => {
    render(<StatCards groups={[]} isLoading={false} />, { wrapper: Wrapper });

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0/0/0')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
