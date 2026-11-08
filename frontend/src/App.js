import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import LandingPage from './pages/landing';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import VideoMeetComponent from './pages/VideoMeet';
import HomeComponent from './pages/home';
import History from './pages/history';
import ProfileComponent from './pages/profileComponent'; // ছোট হাতের 'p' দিয়ে ঠিক করা হয়েছে

function App() {
  return (
    <div className="App">
      <Router>
        <AuthProvider>
          <Routes>
            {/* ১. ওয়েবসাইট খুললেই প্রথমে ল্যান্ডিং পেজ শো করবে */}
            <Route path='/' element={<LandingPage />} />

            {/* ২. লগইন ও রেজিস্ট্রেশন পেজ */}
            <Route path='/auth' element={<Authentication />} />

            {/* ৩. ব্যবহারকারীর হোম ড্যাশবোর্ড */}
            <Route path='/home' element={<HomeComponent />} />

            {/* ৪. মিটিং হিস্ট্রি, ডায়ালগ ও PDF ডাউনলোড পেজ */}
            <Route path='/history' element={<History />} />

            {/* ৫. ইউজারের প্রোফাইল পেজ */}
            <Route path='/profile' element={<ProfileComponent />} />

            {/* ৬. ভিডিও মিটিং রুম */}
            <Route path='/:url' element={<VideoMeetComponent />} />
          </Routes>
        </AuthProvider>
      </Router>
    </div>
  );
}

export default App;