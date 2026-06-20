import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { appRoutes } from './routeConfig';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleRoute } from './routes/RoleRoute';

import JobSeekerLayout from './layouts/JobSeekerLayout';
import GlobalCompanyWatcher from './components/GlobalCompanyWatcher';
import BackToTop from './components/BackToTop';
import ScrollProgress from './motion/ScrollProgress';

function App() {
  const renderRoute = (route) => {
    let element = route.element;

    if (route.path?.startsWith('/seeker')) {
      element = <JobSeekerLayout>{element}</JobSeekerLayout>;
    }

    if (route.roles) {
      element = (
        <ProtectedRoute>
          <RoleRoute allowedRoles={route.roles}>{element}</RoleRoute>
        </ProtectedRoute>
      );
    }

    return (
      <Route key={route.path || route.index} path={route.path} index={route.index} element={element}>
        {route.children?.map(renderRoute)}
      </Route>
    );
  };

  return (
    <>
      <GlobalCompanyWatcher />
      <ScrollProgress />
      <BackToTop />
      <Routes>
        {appRoutes.map(renderRoute)}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </>
  );
}

export default App;
