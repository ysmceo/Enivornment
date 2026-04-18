import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Filter, MapPin, Zap } from 'lucide-react';
import { reportService } from '../services/reportService';
import Badge from './Badge';
import toast from 'react-hot-toast';

// Fix Leaflet icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const GoogleMap = ({ height = '400px', center = [9.082, 8.6753], zoom = 6, reports = [], summary, onReportSelect }) => {
  const [mapData, setMapData] = useState([]);
  const [filters, setFilters] = useState({ severity: 'all', category: 'all' });
  const [heatLayer, setHeatLayer] = useState(null);

  useEffect(() => {
    if (reports.length === 0) return;

    const points = reports
      .filter(r => r.location?.coordinates?.coordinates?.length === 2)
      .map(r => {
        const [lng, lat] = r.location.coordinates.coordinates;
        const intensity = r.severity === 'critical' ? 0.8 : r.severity === 'high' ? 0.5 : 0.2;
        return [lat, lng, intensity];
      });

    setMapData(points);
  }, [reports]);

  const FilteredMarkers = ({ data }) => {
    useMapEvents({
      click(e) {
        toast(`Clicked at [${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}]`);
      },
    });

    const filtered = data.filter(r => {
      if (filters.severity !== 'all' && r.severity !== filters.severity) return false;
      if (filters.category !== 'all' && r.category !== filters.category) return false;
      return r.location?.coordinates?.coordinates?.length === 2;
    });

    return filtered.map((report) => {
      const [lng, lat] = report.location.coordinates.coordinates;
      return (
        <Marker key={report._id} position={[lat, lng]}>
          <Popup>
            <div className="min-w-[280px] space-y-2">
              <h4 className="font-bold text-lg">{report.title}</h4>
              <div className="flex items-center gap-2">
                <Badge status={report.status} />
                <Badge variant="severity">{report.severity}</Badge>
              </div>
              <p className="text-sm text-slate-600">{report.category.replace(/_/g, ' ')}</p>
              <p className="text-sm font-mono">{report.state}</p>
              {report.riskScore && (
                <div className="flex items-center gap-1 text-sm bg-gradient-to-r from-yellow-400 to-red-500 text-white px-2 py-1 rounded-full">
                  <Zap className="w-3 h-3" />
                  Risk: {report.riskScore.toFixed(0)}
                </div>
              )}
              <button
                onClick={() => onReportSelect?.(report)}
                className="w-full btn-primary text-xs py-1 mt-2"
              >
                View Details
              </button>
            </div>
          </Popup>
        </Marker>
      );
    });
  };

  const ToggleHeatmap = () => {
    const map = useMapEvents({
      overlayadd(e) {
        if (e.layer === heatLayer) setHeatLayer(null);
      },
      overlayremove(e) {
        if (!heatLayer) setHeatLayer(e.layer);
      },
    });

    return null;
  };

  return (
    <div className="relative">
      {/* Filters */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border space-y-2 max-w-sm">
        <div className="flex flex-wrap gap-2 text-xs">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.severity === 'all'}
              onChange={(e) => setFilters({ ...filters, severity: e.target.checked ? 'all' : 'high' })}
              className="rounded"
            />
            All Severity
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.category === 'all'}
              onChange={(e) => setFilters({ ...filters, category: e.target.checked ? 'all' : 'crime' })}
              className="rounded"
            />
            All Categories
          </label>
        </div>
        <button className="flex items-center gap-1 text-xs btn-secondary w-full justify-center">
          <Filter className="w-3 h-3" />
          More Filters
        </button>
        {summary && (
          <div className="text-xs space-y-1 pt-1">
            <p>Total: <span className="font-bold">{summary.totalReports}</span></p>
            <p>High Risk: <span className="font-bold text-red-500">{summary.highRiskCount}</span></p>
          </div>
        )}
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height, width: '100%' }}
        className="rounded-xl shadow-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mapData.length > 0 && (
          <HeatLayer
            points={mapData}
            max={1.0}
            radius={25}
            gradient={{ 0.4: '#ff0000', 0.65: '#ffff00', 1: '#00ff00' }}
          />
        )}
        <FilteredMarkers data={reports} />
      </MapContainer>
    </div>
  );
};

export default GoogleMap;

