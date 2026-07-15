import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ShopOwnerView from './pages/ShopOwnerView';
import ShopPipeline from './pages/ShopPipeline';
import LoanApply from './pages/LoanApply';
import DashboardView from './pages/DashboardView';
import ShopDetailAdmin from './pages/ShopDetailAdmin';
import ShopRepayments from './pages/ShopRepayments';
import ShopLoanHistory from './pages/ShopLoanHistory';
import AllLoanHistory from './pages/AllLoanHistory';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop-owner" element={<ShopOwnerView />} />
        <Route path="/shop-owner/history" element={<AllLoanHistory />} />
        <Route path="/shop-owner/:shopId" element={<ShopPipeline />} />
        <Route path="/shop-owner/:shopId/apply" element={<LoanApply />} />
        <Route path="/dashboard" element={<DashboardView />} />
        <Route path="/dashboard/shop/:shopId" element={<ShopDetailAdmin />} />
        <Route path="/shop-owner/:shopId/repayments" element={<ShopRepayments />} />
        <Route path="/shop-owner/:shopId/history" element={<ShopLoanHistory />} />
    
      </Routes>
    </BrowserRouter>
  );
}

export default App;