import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MonitorPage } from '@/pages/MonitorPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MonitorPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
