import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import GoogleMap from '../components/GoogleMap';
import { reportService } from '../services/reportService';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Download, Filter, Zap, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

const CrimeAnalytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mapReports, setMapReports] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({
    state: 'all',
    category: 'all',
    severity: 'all',
    period: '30d', // 7d, 30d, 90d, all
  });
  const [activeTab, setActiveTab] = useState('map');

  useEffect(() => {
    loadAnalytics();
  }, [filters]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { state, category, severity } = filters;
      const params = new URLSearchParams();
      if (filters.state !== 'all') params.append('state', filters.state);
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.severity !== 'all') params.append('severity', filters.severity);

      const [mapRes, summaryRes] = await Promise.all([
        reportService.getMapReports(params.toString() ? `?${params}` : ''),
        reportService.getMapSummary(),
      ]);

      setMapReports(mapRes.data.reports || []);
      setSummary(summaryRes.data.summary);
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Total Incidents', value: summary?.totalReports || 0, icon: BarChart3, trend: '+12%' },
    { label: 'High Risk', value: summary?.highRiskCount || 0, icon: Zap, trend: '+5%', variant: 'warning' },
    { label: 'Avg Risk Score', value: (summary?.highRiskCount / (summary?.totalReports || 1) * 100)?.toFixed(1) + '%', icon: Filter },
  ];

  if (!user || user.role !== 'admin') {
    return <div className="card p-8 text-center">Admin access required.</div>;
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Crime Analytics Dashboard</h1>
          <p className="text-slate-500">Interactive maps, trends, and heatmaps.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <StatsCard key={i} {...stat} />
        ))}
      </div>

      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Interactive Crime Map</h2>
          <div className="flex gap-2 text-sm">
            <button className={`px-3 py-1 rounded-full ${activeTab === 'map' ? 'bg-indigo-100 text-indigo-700' : ''}`}>
              Map
            </button>
            <button className={`px-3 py-1 rounded-full ${activeTab === 'trends' ? 'bg-indigo-100 text-indigo-700' : ''}`}>
              Trends
            </button>
            <button className={`px-3 py-1 rounded-full ${activeTab === 'sos' ? 'bg-indigo-100 text-indigo-700' : ''}`}>
              Active SOS
            </button>
          </div>
        </div>

        {activeTab === 'map' && (
          <GoogleMap
            height="500px"
            zoom={6}
            reports={mapReports}
            summary={summary}
            onReportSelect={(report) => toast(`Selected: ${report.title}`)}
          />
        )}

        {activeTab === 'trends' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 h-[500px]">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-2xl">
              <h3 className="font-semibold mb-4">By State</h3>
              <ul className="space-y-2">
                {summary?.byState?.slice(0, 6).map((s, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{s._id}</span>
                    <span className="font-bold">{s.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* More charts */}
          </div>
        )}

        {activeTab === 'sos' && (
          <p>Active SOS list (integrate later)</p>
        )}
      </div>
    </div>
  );
};

export default CrimeAnalytics;

