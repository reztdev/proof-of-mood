import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Calendar, TrendingUp, Award, Target, Wallet, CheckCircle, XCircle } from 'lucide-react';

const ProofOfMoodDApp = () => {
  const [account, setAccount] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [moodHistory, setMoodHistory] = useState([]);
  const [userStats, setUserStats] = useState({
    totalCheckins: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalMoodPoints: 0
  });
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');

  const SEPOLIA_CHAIN_ID = '0xaa36a7';

  const moods = [
    { level: 1, emoji: '😢', label: 'Very Sad' },
    { level: 2, emoji: '😞', label: 'Sad' },
    { level: 3, emoji: '😐', label: 'Neutral' },
    { level: 4, emoji: '😊', label: 'Happy' },
    { level: 5, emoji: '😄', label: 'Very Happy' }
  ];

  // Mock data untuk demo
  const mockMoodHistory = [
    { day: 'Mon', mood: 4, emoji: '😊', date: '2024-01-15' },
    { day: 'Tue', mood: 3, emoji: '😐', date: '2024-01-16' },
    { day: 'Wed', mood: 5, emoji: '😄', date: '2024-01-17' },
    { day: 'Thu', mood: 4, emoji: '😊', date: '2024-01-18' },
    { day: 'Fri', mood: 2, emoji: '😞', date: '2024-01-19' },
    { day: 'Sat', mood: 5, emoji: '😄', date: '2024-01-20' },
    { day: 'Sun', mood: 4, emoji: '😊', date: '2024-01-21' }
  ];

  const monthlyData = [
    { name: 'Week 1', completed: 6, total: 7 },
    { name: 'Week 2', completed: 5, total: 7 },
    { name: 'Week 3', completed: 7, total: 7 },
    { name: 'Week 4', completed: 4, total: 7 }
  ];

  const moodDistribution = [
    { name: 'Very Sad', value: 2, color: '#ef4444' },
    { name: 'Sad', value: 3, color: '#f97316' },
    { name: 'Neutral', value: 8, color: '#eab308' },
    { name: 'Happy', value: 12, color: '#22c55e' },
    { name: 'Very Happy', value: 5, color: '#3b82f6' }
  ];

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && !window.ethereum) {
      alert('Please install Wallet Metamask');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      // Switch to Sepolia testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });

      setAccount(accounts[0]);
      checkRegistration(accounts[0]);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      // Untuk demo, tetap set account jika MetaMask tidak tersedia
      const demoAccount = '0x1234567890123456789012345678901234567890';
      setAccount(demoAccount);
      checkRegistration(demoAccount);
    }
  };

  const checkRegistration = async (address) => {
    // Mock check - in real app, call smart contract
    setIsRegistered(true);
    setHasCheckedInToday(false);
    setMoodHistory(mockMoodHistory);
    setUserStats({
      totalCheckins: 22,
      currentStreak: 5,
      longestStreak: 12,
      totalMoodPoints: 88
    });
  };

  const registerUser = async () => {
    setLoading(true);
    try {
      // Mock registration - in real app, call smart contract
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsRegistered(true);
      setTxHash('0xabcdef123456789...');
    } catch (error) {
      console.error('Registration error:', error);
    }
    setLoading(false);
  };

  const checkInMood = async () => {
    if (!selectedMood) return;

    setLoading(true);
    try {
      // Mock check-in - in real app, call smart contract
      await new Promise(resolve => setTimeout(resolve, 2000));
      setHasCheckedInToday(true);
      setUserStats(prev => ({
        ...prev,
        totalCheckins: prev.totalCheckins + 1,
        currentStreak: prev.currentStreak + 1,
        totalMoodPoints: prev.totalMoodPoints + selectedMood.level
      }));
      setTxHash('0xabcdef123456789...');
      setSelectedMood(null);
    } catch (error) {
      console.error('Check-in error:', error);
    }
    setLoading(false);
  };

  const getAverageMood = () => {
    if (moodHistory.length === 0) return 0;
    const sum = moodHistory.reduce((acc, entry) => acc + entry.mood, 0);
    return (sum / moodHistory.length).toFixed(1);
  };

  const getMonthlyCompletion = () => {
    return Math.round((22 / 30) * 100); // 22 check-ins out of 30 days
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-400 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20">
          <div className="text-center">
            <div className="text-6xl mb-4">🎭</div>
            <h1 className="text-3xl font-bold text-white mb-2">Proof of Mood</h1>
            <p className="text-white/80 mb-6">Track your daily mood on-chain</p>
            <button
              onClick={connectWallet}
              className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Wallet size={20} />
              Connect Wallet
            </button>
            <p className="text-white/60 text-sm mt-4">
              Sepolia Testnet Required
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-400 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20">
          <div className="text-center">
            <div className="text-6xl mb-4">🎭</div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome!</h1>
            <p className="text-white/80 mb-6">Register to start tracking your mood</p>
            <button
              onClick={registerUser}
              disabled={loading}
              className="w-full bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
            <p className="text-white/60 text-sm mt-4">
              Connected: {account.slice(0, 6)}...{account.slice(-4)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-400 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                🎭 Proof of Mood
              </h1>
              <p className="text-white/80">
                Connected: {account.slice(0, 6)}...{account.slice(-4)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-white/80 text-sm">Daily Check-in</div>
              <div className="flex items-center gap-2 text-white">
                {hasCheckedInToday ? (
                  <><CheckCircle className="text-green-400" size={20} /> Done</>
                ) : (
                  <><XCircle className="text-red-400" size={20} /> Pending</>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              <Calendar className="text-blue-400" size={24} />
              <div>
                <div className="text-white/80 text-sm">Total Check-ins</div>
                <div className="text-2xl font-bold text-white">{userStats.totalCheckins}</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-green-400" size={24} />
              <div>
                <div className="text-white/80 text-sm">Current Streak</div>
                <div className="text-2xl font-bold text-white">{userStats.currentStreak}</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              <Award className="text-yellow-400" size={24} />
              <div>
                <div className="text-white/80 text-sm">Longest Streak</div>
                <div className="text-2xl font-bold text-white">{userStats.longestStreak}</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              <Target className="text-purple-400" size={24} />
              <div>
                <div className="text-white/80 text-sm">Avg Mood</div>
                <div className="text-2xl font-bold text-white">{getAverageMood()}/5</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Check-in Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Daily Check-in</h2>
            
            {!hasCheckedInToday ? (
              <div>
                <p className="text-white/80 mb-4">How are you feeling today?</p>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {moods.map((mood) => (
                    <button
                      key={mood.level}
                      onClick={() => setSelectedMood(mood)}
                      className={`p-3 rounded-lg transition-all ${
                        selectedMood?.level === mood.level
                          ? 'bg-white/30 scale-110'
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      <div className="text-2xl mb-1">{mood.emoji}</div>
                      <div className="text-white/80 text-xs">{mood.label}</div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={checkInMood}
                  disabled={!selectedMood || loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all duration-200"
                >
                  {loading ? 'Checking in...' : 'Check In'}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-white/80">Already checked in today!</p>
                <p className="text-white/60 text-sm mt-2">Come back tomorrow</p>
              </div>
            )}

            {txHash && (
              <div className="mt-4 p-3 bg-green-500/20 rounded-lg">
                <p className="text-green-400 text-sm">
                  Transaction: {txHash}
                </p>
              </div>
            )}
          </div>

          {/* Monthly Progress */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Monthly Progress</h2>
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-white mb-2">{getMonthlyCompletion()}%</div>
              <p className="text-white/80">22 out of 30 days completed</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="name" stroke="#ffffff60" />
                <YAxis stroke="#ffffff60" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    backdropFilter: 'blur(10px)'
                  }}
                />
                <Bar dataKey="completed" fill="#8b5cf6" />
                <Bar dataKey="total" fill="#ffffff20" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Mood Trend */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Mood Trend (7 Days)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={moodHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="day" stroke="#ffffff60" />
                <YAxis domain={[1, 5]} stroke="#ffffff60" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    backdropFilter: 'blur(10px)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="mood" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Mood Distribution */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Mood Distribution</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={moodDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {moodDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    backdropFilter: 'blur(10px)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProofOfMoodDApp;