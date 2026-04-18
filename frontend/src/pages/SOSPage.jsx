import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Phone, MapPin, Video, Share2, StopCircle, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const SOSPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();
  const [sosActive, setSosActive] = useState(null);
  const [location, setLocation] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [tracking, setTracking] = useState(false);

  // Redirect if not verified
  useEffect(() => {
    if (!user || user.idVerificationStatus !== 'verified') {
      toast.error('SOS requires verified ID. Please complete verification.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
        reject,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  };

  const activateSOS = async () => {
    if (countdown > 0) return;

    try {
      const currentLoc = await getCurrentLocation();
      const response = await api.post('/sos', {
        title: 'Emergency SOS - Help Needed Now!',
        description: 'Live location tracking activated. Authorities notified.',
        latitude: currentLoc.latitude,
        longitude: currentLoc.longitude,
      });

      toast.success('🚨 SOS ACTIVATED! Help dispatched. Tracking live.');
      setSosActive(response.data.alert);
      setLocation(currentLoc);

      // Start live tracking
      startLocationTracking(response.data.alert._id);

      // Join SOS socket room
      socket.emit('join-room', { roomId: `sos_${response.data.alert._id}` });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to activate SOS');
    }
  };

  const startLocationTracking = async (alertId) => {
    setTracking(true);
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const loc = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed: pos.coords.speed || 0,
          accuracy: pos.coords.accuracy || 0,
        };
        setLocation(loc);

        // Update server every 5s
        try {
          await api.put(`/sos/${alertId}/location`, loc);
        } catch {}

        // Emit to socket for real-time admin tracking
        socket.emit('sos-location-update', { alertId, ...loc });
      },
      (err) => toast.error('Location tracking error: ' + err.message),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 1000 }
    );
    setWatchId(id);
  };

  const stopSOS = async () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
    try {
      if (sosActive?._id) {
        await api.post(`/sos/${sosActive._id}/cancel`);
      }
      toast.success('SOS cancelled.');
    } catch {}
    setSosActive(null);
    setTracking(false);
    setLocation(null);
  };

  // Countdown on mount
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [user]);

  if (!user) return <LoadingSpinner />;

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-slate-900">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <header className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-red-500 flex items-center justify-center shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Emergency SOS</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
            One-tap emergency alert with live location & video. Authorities notified instantly.
          </p>
        </header>

        {!sosActive ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-gray-500 mb-8">
              Ready to activate in <span className="font-mono bg-red-100 px-2 py-1 rounded-full text-red-800">{countdown}</span>
            </p>
            <button
              onClick={activateSOS}
              disabled={countdown > 0}
              className="btn-danger w-full h-20 text-2xl font-bold shadow-2xl transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-3 text-white"
            >
              🚨 EMERGENCY SOS
              <Phone className="w-8 h-8" />
            </button>
            <p className="text-xs text-gray-500 mt-4">Verified user only. Live tracks your position.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="card p-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
              <h2 className="font-bold text-xl text-red-900 dark:text-red-100 mb-2">SOS ACTIVE</h2>
              <p className="text-red-800 dark:text-red-200">Authorities notified. Do not close this page.</p>
            </div>

            <div className="card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-5 h-5 text-emerald-500" />
                <span>Live GPS: {tracking ? 'ONLINE' : 'OFFLINE'}</span>
                {location && (
                  <span className="font-mono bg-emerald-100 dark:bg-emerald-900 px-2 py-1 rounded text-xs">
                    [{location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}]
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Video className="w-5 h-5 text-indigo-500" />
                <span>Live Stream: <span className="font-semibold text-indigo-600">Active</span></span>
              </div>
            </div>

            <div className="card p-6 text-center">
              <button
                onClick={stopSOS}
                className="btn-secondary w-full h-16 text-xl font-bold hover:bg-gray-600 transition-colors"
              >
                <StopCircle className="w-8 h-8 inline mr-2" />
                Cancel SOS (Safe Now)
              </button>
            </div>

            <div className="card p-4 text-xs text-center text-gray-500 space-y-1">
              <p>Share tracking link:</p>
              <div className="flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                <Share2 className="w-4 h-4" />
                <span className="font-mono truncate">yourapp.com/track/sos-{sosActive?._id || 'active'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default SOSPage;

