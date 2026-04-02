import 'bootstrap/dist/css/bootstrap.min.css';

const FullPageLoading = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div className="text-center">
        <div 
          className="spinner-border text-primary" 
          role="status"
          style={{ width: '3rem', height: '3rem' }}
        >
          <span className="visually-hidden">Loading...</span>
        </div>
        <div className="mt-3 fw-bold text-primary">處理中，請稍候...</div>
      </div>
    </div>
  );
};

export default FullPageLoading;
