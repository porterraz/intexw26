import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HeartIcon, TrendingUpIcon, CalendarIcon } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { getDonations, getPublicImpactSnapshot, type Donation } from '../lib/api';

export function DonorDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [activeSafehouses, setActiveSafehouses] = useState<number>(0);
  const [totalDonors, setTotalDonors] = useState<number>(0);
  const [lifetimeGiving, setLifetimeGiving] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [donationRows, snapshot] = await Promise.all([
          getDonations(1, 100),
          getPublicImpactSnapshot(),
        ]);
        if (!active) return;
        setDonations(donationRows);
        setLifetimeGiving(donationRows.reduce((sum, d) => sum + (Number(d.amount) || 0), 0));
        setActiveSafehouses(snapshot.activeSafehouses ?? 0);
        setTotalDonors(snapshot.totalDonors ?? 0);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load donor dashboard data.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadData();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-surface-dark">
          {t('Welcome back')}, {user?.email?.split('@')[0] || 'Donor'}
        </h1>
      </div>

      {/* Impact Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-slate-200 p-6 rounded-xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-brand-50 text-brand rounded-lg">
            <HeartIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-surface-text font-medium">Lifetime Giving</p>
            <p className="text-2xl font-bold text-surface-dark">${lifetimeGiving.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-surface border border-slate-200 p-6 rounded-xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-accent/10 text-accent rounded-lg">
            <TrendingUpIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-surface-text font-medium">Active Safehouses Supported</p>
            <p className="text-2xl font-bold text-surface-dark">{activeSafehouses}</p>
          </div>
        </div>
        <div className="bg-surface border border-slate-200 p-6 rounded-xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-brand-50 text-brand rounded-lg">
            <HeartIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-surface-text font-medium">Community Donors</p>
            <p className="text-2xl font-bold text-surface-dark">{totalDonors}</p>
          </div>
        </div>
      </div>

      {/* Donation History Table */}
      <div className="bg-surface border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-surface-dark flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand" />
            My Donation History
          </h2>
          <button className="text-sm text-brand hover:text-brand-dark font-medium">Download Tax Receipt</button>
        </div>
        {loading && <p className="px-6 py-3 text-sm text-surface-text">Loading donation history...</p>}
        {!loading && error && <p className="px-6 py-3 text-sm text-red-500">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-sm text-surface-text">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Fund Designation</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && donations.length === 0 && (
                <tr>
                  <td className="px-6 py-4 text-surface-text" colSpan={4}>
                    No donation records found yet.
                  </td>
                </tr>
              )}
              {donations.map((d) => (
                <tr key={d.donationId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-surface-text">{new Date(d.donationDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-medium text-surface-dark">{d.designation || 'General Fund'}</td>
                  <td className="px-6 py-4 text-surface-dark font-semibold">${Number(d.amount).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
                      Completed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DonorDashboard