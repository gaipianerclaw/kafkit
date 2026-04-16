import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCards } from '../StatCards';
import type { DashboardConsumerGroup } from '../../../types/dashboard';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'dashboard.stats.totalGroups': 'Total Groups',
        'dashboard.stats.healthStatus': 'Health Status',
        'dashboard.stats.healthSubtitle': 'Healthy/Warning/Critical',
        'dashboard.stats.totalLag': 'Total Lag',
      };
      return translations[key] || key;
    },
  }),
}));

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
    render(<StatCards groups={mockGroups} isLoading={false} />);

    expect(screen.getByText('Total Groups')).toBeInTheDocument();
    expect(screen.getByText('Health Status')).toBeInTheDocument();
    expect(screen.getByText('Total Lag')).toBeInTheDocument();
  });

  it('should display correct total groups count', () => {
    render(<StatCards groups={mockGroups} isLoading={false} />);

    expect(screen.getByText('3')).toBeInTheDocument(); // Total groups
  });

  it('should display correct health distribution', () => {
    render(<StatCards groups={mockGroups} isLoading={false} />);

    expect(screen.getByText('1/1/1')).toBeInTheDocument(); // healthy/warning/critical
  });

  it('should display correct total lag', () => {
    render(<StatCards groups={mockGroups} isLoading={false} />);

    // 500 + 5000 + 15000 = 20500 = 20.5K
    expect(screen.getByText('20.5K')).toBeInTheDocument();
  });

  it('should show loading skeleton when isLoading is true', () => {
    render(<StatCards groups={[]} isLoading={true} />);

    // Check for skeleton elements by class
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should handle empty groups', () => {
    render(<StatCards groups={[]} isLoading={false} />);

    // Total groups shows '0', total lag also shows '0'
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('0/0/0')).toBeInTheDocument();
  });
});
