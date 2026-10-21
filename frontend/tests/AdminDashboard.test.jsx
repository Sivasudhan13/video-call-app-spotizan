import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboardPage } from '../src/pages/AdminDashboardPage';
import { AuthContext } from '../src/context/AuthContext';
import * as apiModule from '../src/services/api';

describe('AdminDashboardPage Rendering Test', () => {
  it('renders AdminDashboardPage without any runtime crash', async () => {
    vi.spyOn(apiModule.api, 'get').mockResolvedValue({
      success: true,
      data: {
        totalUsers: 10,
        verifiedAdultUsers: 8,
        approvedCreators: 3,
        activeCalls: 1,
        completedCalls: 20,
        freeCallsConsumed: 5,
        paidCallsCompleted: 15,
        grossPaymentVolumeINR: '1400.00',
        platformRevenueINR: '420.00',
        openReports: 0,
      },
    });

    const mockAdminUser = {
      _id: 'admin-123',
      email: 'admin@spotizan.com',
      displayName: 'Platform Admin',
      role: 'ADMIN',
      isAdult: true,
    };

    const mockAuthContext = {
      user: mockAdminUser,
      isAuthenticated: true,
      loading: false,
      isAdult: true,
      logout: vi.fn(),
      login: vi.fn(),
    };

    const { container } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <AdminDashboardPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(container).toBeDefined();
    expect(container.textContent).toContain('Spotizan');
    expect(container.textContent).toContain('Analytics Overview');
  });
});
