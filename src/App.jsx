import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';

const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 40.7128, lng: -74.0060 }; // New York fallback

// Dynamic environment lookups
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;


export default function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [userLocation, setUserLocation] = useState(defaultCenter);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY" // Inject your API key safely
  });

  // Track user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(loc);
        },
        () => console.log("Geolocation access denied.")
      );
    }
  }, []);

  // Fetch Shops
  useEffect(() => {
    fetch(`${API_BASE_URL}/shops?lat=${userLocation.lat}&lng=${userLocation.lng}`)
      .then(res => res.json())
      .then(data => setShops(data))
      .catch(err => console.error(err));
  }, [userLocation]);

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isSignUp ? 'signup' : 'login';
    const res = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    } else {
      alert(data.error || 'Authentication failed');
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Navbar */}
      <header className="flex justify-between items-center p-4 bg-white shadow-md z-10">
        <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">📍 ShopFinder</h1>
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button onClick={logout} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">Logout</button>
          </div>
        ) : (
          <span className="text-sm text-gray-500">Sign in to unlock personalized alerts</span>
        )}
      </header>

      {/* Main Content Split View */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar: Auth & Shop Grid */}
        <div className="w-full md:w-5/12 p-4 overflow-y-auto border-r border-gray-200">
          {!user ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4">{isSignUp ? 'Create an Account' : 'Welcome Back'}</h2>
              <form onSubmit={handleAuth} className="space-y-4">
                <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </button>
              </form>
              <button onClick={() => setIsSignUp(!isSignUp)} className="mt-4 text-sm text-indigo-500 hover:underline w-full text-center">
                {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Shops Near You</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {shops.map(shop => (
                  <div key={shop.id} onClick={() => { setSelectedShop(shop); setUserLocation({ lat: parseFloat(shop.latitude), lng: parseFloat(shop.longitude) }); }} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 cursor-pointer hover:shadow-md transition">
                    <img src={shop.image_url} alt={shop.name} className="w-full h-32 object-cover" />
                    <div className="p-3">
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">{shop.category}</span>
                      <h3 className="font-bold mt-1 text-sm truncate">{shop.name}</h3>
                      <p className="text-xs text-gray-500 truncate">{shop.address}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Map Layout Container */}
        <div className="w-full md:w-7/12 h-96 md:h-full relative">
          {isLoaded ? (
            <GoogleMap mapContainerStyle={mapContainerStyle} center={userLocation} zoom={14}>
              <MarkerF position={userLocation} label="You" />
              {shops.map(shop => (
                <MarkerF key={shop.id} position={{ lat: parseFloat(shop.latitude), lng: parseFloat(shop.longitude) }} onClick={() => setSelectedShop(shop)} />
              ))}
              {selectedShop && (
                <InfoWindowF position={{ lat: parseFloat(selectedShop.latitude), lng: parseFloat(selectedShop.longitude) }} onCloseClick={() => setSelectedShop(null)}>
                  <div className="p-1 max-w-xs">
                    <img src={selectedShop.image_url} alt={selectedShop.name} className="w-full h-20 object-cover rounded" />
                    <h4 className="font-bold text-sm mt-1">{selectedShop.name}</h4>
                    <p className="text-xs text-gray-600">{selectedShop.address}</p>
                  </div>
                </InfoWindowF>
              )}
            </GoogleMap>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">Loading Map View...</div>
          )}
        </div>
      </div>
    </div>
  );
}
