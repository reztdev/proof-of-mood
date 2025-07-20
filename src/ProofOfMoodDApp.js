import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import {
  Calendar, TrendingUp, Award, Target, Wallet, CheckCircle, XCircle,
  LogOut, Clock, RefreshCw
} from 'lucide-react';
import contractAbi from './abis/ProofOfMood.json';

const CONTRACT_ADDRESS = '0xdA8DFdf0c8fc85aeCecF19d26D0EBB84173Fb2Ec';
const SEPOLIA_CHAIN_ID = '0xaa36a7';
const CHECKIN_RESET_HOUR = 6;

const isMetaMaskInstalled = () => {
  return typeof window !== 'undefined' && window.ethereum && window.ethereum.isMetaMask;
};

const canCheckInToday = (lastCheckinTimestamp) => {
  if (!lastCheckinTimestamp) return true;
  const now = new Date();
  const lastCheckin = new Date(lastCheckinTimestamp);
  const todayReset = new Date();
  todayReset.setHours(CHECKIN_RESET_HOUR, 0, 0, 0);
  if (now.getTime() < todayReset.getTime()) {
    todayReset.setDate(todayReset.getDate() - 1);
  }
  return lastCheckin.getTime() < todayReset.getTime();
};

const getAverageMood = (moodHistory) => {
  if (!Array.isArray(moodHistory) || moodHistory.length === 0) return '0.0';
  const sum = moodHistory.reduce((acc, entry) => acc + entry.mood, 0);
  return (sum / moodHistory.length).toFixed(1);
};

const getMonthlyCompletion = (totalCheckins) => {
  return Math.round((totalCheckins / 30) * 100);
};

const getMoodDistribution = (moodHistory, moods) => {
  if (!Array.isArray(moods) || !Array.isArray(moodHistory)) return [];
  
  const distribution = moods.map(mood => ({
    name: mood.label,
    value: 0,
    color: mood.color
  }));

  moodHistory.forEach(entry => {
    const moodIndex = entry.mood - 1;
    if (moodIndex >= 0 && moodIndex < distribution.length) {
      distribution[moodIndex].value++;
    }
  });

  return distribution.filter(item => item.value > 0);
};


const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-3">
        <p className="text-white font-medium">{`${label}: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const ProofOfMoodDApp = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
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
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState('');
  const [lastCheckinTime, setLastCheckinTime] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const moods = useMemo(() => [
    { level: 1, emoji: '😢', label: 'Very Sad', color: '#ef4444' },
    { level: 2, emoji: '😞', label: 'Sad', color: '#f97316' },
    { level: 3, emoji: '😐', label: 'Neutral', color: '#eab308' },
    { level: 4, emoji: '😊', label: 'Happy', color: '#22c55e' },
    { level: 5, emoji: '😄', label: 'Very Happy', color: '#3b82f6' },
  ], []);

  const STORAGE_KEYS = useMemo(() => ({
    WALLET: 'pom_wallet_address',
    USER_DATA: 'pom_user_data',
    MOOD_HISTORY: 'pom_mood_history',
    LAST_CHECKIN: 'pom_last_checkin'
  }), []);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setHasCheckedInToday(false);
    setSelectedMood(null);
    setMoodHistory([]);
    setUserStats({
      totalCheckins: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalMoodPoints: 0
    });
    setLastCheckinTime(null);
    setCountdown('');
    setTxHash('');
    setError('');
    setProvider(null);
    setSigner(null);
    setContract(null);
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }, [STORAGE_KEYS])

  const getNext6AM = () => {
    const now = new Date();
    const next6AM = new Date();
    next6AM.setHours(CHECKIN_RESET_HOUR, 0, 0, 0);
    if (now.getTime() >= next6AM.getTime()) {
      next6AM.setDate(next6AM.getDate() + 1);
    }
    return next6AM.getTime();
  };

  const canCheckInToday = (lastCheckinTimestamp) => {
    if (!lastCheckinTimestamp) return true;
    const now = new Date();
    const lastCheckin = new Date(lastCheckinTimestamp);
    const todayReset = new Date();
    todayReset.setHours(CHECKIN_RESET_HOUR, 0, 0, 0);
    if (now.getTime() < todayReset.getTime()) {
      todayReset.setDate(todayReset.getDate() - 1);
    }
    return lastCheckin.getTime() < todayReset.getTime();
  };

  const connectWallet = async () => {
    if (isConnecting) return;
    setError('');
    setIsConnecting(true);
    setLoading(true);
    try {
      if (!isMetaMaskInstalled()) {
        throw new Error('MetaMask is not installed. Please install MetaMask wallet extension.');
      }
      const ethProvider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await ethProvider.send('eth_requestAccounts', []);
      const network = await ethProvider.getNetwork();
      if (network.chainId !== parseInt(SEPOLIA_CHAIN_ID, 16)) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
      }
      const connectedAccount = accounts[0];
      const userSigner = ethProvider.getSigner();
      const moodContract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, userSigner);

      setAccount(connectedAccount);
      setProvider(ethProvider);
      setSigner(userSigner);
      setContract(moodContract);

      localStorage.setItem(STORAGE_KEYS.WALLET, connectedAccount);

      console.log('✅ Wallet connected:', connectedAccount);
      console.log('✅ Contract instance:', moodContract);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError(error.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
      setIsConnecting(false);
    }
  };

  const checkInMood = async () => {
    console.log('🧠 selectedMood:', selectedMood);
    console.log('👛 account:', account);
    console.log('📄 contract:', contract);

    if (!selectedMood || !account || !contract) {
      setError('Please select a mood and ensure wallet is connected');
      return;
    }
    if (!canCheckInToday(lastCheckinTime)) {
      setError('You have already checked in today. Next check-in available at 6:00 AM.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const tx = await contract.checkIn(selectedMood.level);
      const receipt = await tx.wait();
      const now = Date.now();

      const newMoodEntry = {
        day: new Date().toLocaleDateString('en-US', { weekday: 'short' }),
        mood: selectedMood.level,
        emoji: selectedMood.emoji,
        date: new Date().toISOString().split('T')[0],
        timestamp: now,
        txHash: receipt.transactionHash
      };

      const newStats = {
        ...userStats,
        totalCheckins: userStats.totalCheckins + 1,
        totalMoodPoints: userStats.totalMoodPoints + selectedMood.level
      };

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(CHECKIN_RESET_HOUR, 0, 0, 0);
      if (lastCheckinTime && lastCheckinTime >= yesterday.getTime()) {
        newStats.currentStreak = userStats.currentStreak + 1;
      } else {
        newStats.currentStreak = 1;
      }
      newStats.longestStreak = Math.max(newStats.longestStreak, newStats.currentStreak);

      setHasCheckedInToday(true);
      setLastCheckinTime(now);
      const updatedHistory = [...moodHistory.slice(-6), newMoodEntry];
      setMoodHistory(updatedHistory);
      setUserStats(newStats);
      setTxHash(receipt.transactionHash);
      setSelectedMood(null);

      localStorage.setItem(STORAGE_KEYS.LAST_CHECKIN, now.toString());
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(newStats));
      localStorage.setItem(STORAGE_KEYS.MOOD_HISTORY, JSON.stringify(updatedHistory));

      console.log('✅ Check-in success:', receipt.transactionHash);
    } catch (error) {
      console.error('Check-in error:', error);
      if (error.code === 4001) {
        setError('Transaction was rejected by user');
      } else {
        setError(error.message || 'Check-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

const moodData = getMoodDistribution(moodHistory, moods);

useEffect(() => {
  const loadStoredData = () => {
    try {
      const storedWallet = localStorage.getItem(STORAGE_KEYS.WALLET);
      const storedUserData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      const storedMoodHistory = localStorage.getItem(STORAGE_KEYS.MOOD_HISTORY);
      const storedLastCheckin = localStorage.getItem(STORAGE_KEYS.LAST_CHECKIN);

      if (storedWallet) {
        setAccount(storedWallet);
        if (storedUserData) setUserStats(JSON.parse(storedUserData));
        if (storedMoodHistory) setMoodHistory(JSON.parse(storedMoodHistory));
        if (storedLastCheckin) {
          const lastCheckin = parseInt(storedLastCheckin);
          setLastCheckinTime(lastCheckin);
          const alreadyCheckedIn = !canCheckInToday(lastCheckin);
          setHasCheckedInToday(alreadyCheckedIn);
          if (alreadyCheckedIn) {
            const next6AM = getNext6AM();
            const timeLeft = next6AM - Date.now();
            if (timeLeft > 0) {
              const hours = Math.floor(timeLeft / (1000 * 60 * 60));
              const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
              setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to load localStorage data:', error);
    }
  };

  loadStoredData();
}, []);

useEffect(() => {
  if (!hasCheckedInToday || !lastCheckinTime) return;

  const interval = setInterval(() => {
    const now = Date.now();
    const next6AM = getNext6AM();
    const timeLeft = next6AM - now;

    if (timeLeft <= 0) {
      setHasCheckedInToday(false);
      setCountdown('');
      clearInterval(interval);
      return;
    }

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    setCountdown(
      `${hours.toString().padStart(2, '0')}:` +
      `${minutes.toString().padStart(2, '0')}:` +
      `${seconds.toString().padStart(2, '0')}`
    );
  }, 1000);

  return () => clearInterval(interval);
}, [hasCheckedInToday, lastCheckinTime]);


  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-400 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20">
          <div className="text-center">
            <div className="text-6xl mb-4">🎭</div>
            <h1 className="text-3xl font-bold text-white mb-2">Proof of Mood</h1>
            <p className="text-white/80 mb-6">Track your daily mood on blockchain</p>
            
            {!isMetaMaskInstalled() && (
              <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-300 text-sm">
                  MetaMask not detected. 
                  <a 
                    href="https://metamask.io/download/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline ml-1"
                  >
                    Install MetaMask
                  </a>
                </p>
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
            
            <button
              onClick={connectWallet}
              disabled={loading || isConnecting || !isMetaMaskInstalled()}
              className="w-full bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Wallet size={20} />
              {loading || isConnecting ? 'Connecting...' : 'Connect MetaMask'}
            </button>
            
            <p className="text-white/60 text-sm mt-4">
              Sepolia Testnet Required
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
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-white/80 text-sm">Daily Check-in</div>
                <div className="flex items-center gap-2 text-white">
                  {hasCheckedInToday ? (
                    <><CheckCircle className="text-green-400" size={20} /> Done</>
                  ) : (
                    <><XCircle className="text-red-400" size={20} /> Pending</>
                  )}
                </div>
                {countdown && (
                  <div className="flex items-center gap-1 text-orange-300 text-sm mt-1">
                    <Clock size={14} />
                    Next: {countdown}
                  </div>
                )}
              </div>
              <button
                onClick={disconnectWallet}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 p-2 rounded-lg transition-all duration-200"
                title="Disconnect Wallet"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
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
                      className={`p-3 rounded-lg transition-all duration-200 ${
                        selectedMood?.level === mood.level
                          ? 'bg-white/30 scale-105 ring-2 ring-white/50'
                          : 'bg-white/10 hover:bg-white/20 hover:scale-105'
                      }`}
                      disabled={loading}
                    >
                      <div className="text-2xl mb-1">{mood.emoji}</div>
                      <div className="text-white/80 text-xs">{mood.label}</div>
                    </button>
                  ))}
                </div>
                
                {selectedMood && (
                  <div className="mb-4 p-3 bg-white/10 rounded-lg">
                    <p className="text-white/80 text-sm">
                      Selected: {selectedMood.emoji} {selectedMood.label}
                    </p>
                    <p className="text-white/60 text-xs mt-1">
                      This will create a transaction on Sepolia testnet
                    </p>
                  </div>
                )}
                
                <button
                  onClick={checkInMood}
                  disabled={!selectedMood || loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {loading && <RefreshCw size={20} className="animate-spin" />}
                  {loading ? 'Creating Transaction...' : 'Check In & Sign Transaction'}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-white/80 text-lg font-medium">Already checked in today!</p>
                <p className="text-white/60 text-sm mt-2">
                  Next check-in available at 6:00 AM
                </p>
                {countdown && (
                  <div className="mt-3 p-2 bg-orange-500/20 rounded-lg">
                    <div className="flex items-center justify-center gap-2 text-orange-300">
                      <Clock size={16} />
                      <span className="font-mono text-lg">{countdown}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {txHash && (
              <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                <p className="text-green-300 text-sm">
                  ✅ Transaction successful!
                </p>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-300 text-xs underline break-all"
                >
                  {txHash}
                </a>
              </div>
            )}
          </div>

          {/* Monthly Progress */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Monthly Progress</h2>
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-white mb-2">{getMonthlyCompletion()}%</div>
              <p className="text-white/80">{userStats.totalCheckins} out of 30 days completed</p>
            </div>
            {moodHistory.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={moodHistory.slice(-4).map((entry, index) => ({
                  name: `Day ${index + 1}`,
                  mood: entry.mood,
                  emoji: entry.emoji
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="name" stroke="#ffffff60" />
                  <YAxis domain={[1, 5]} stroke="#ffffff60" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="mood" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Charts Section */}
        {moodHistory.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Mood Trend */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Mood Trend</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={moodHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="day" stroke="#ffffff60" />
                  <YAxis domain={[1, 5]} stroke="#ffffff60" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="mood" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: '#8b5cf6', strokeWidth: 2 }}
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
                      data={moodData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                    {moodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProofOfMoodDApp;
