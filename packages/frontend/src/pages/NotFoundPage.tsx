import React from 'react';
import { Link } from 'react-router-dom';
import { useNavigation } from '@/hooks/useNavigation';

export const NotFoundPage: React.FC = () => {
  const { goBack } = useNavigation();

  return (
    <div className="not-found-page">
      <div className="container">
        <h1>404</h1>
        <h2>ページが見つかりません</h2>
        <p>お探しのページは存在しないか、移動した可能性があります。</p>
        <div className="button-group">
          <button onClick={goBack} className="back-button">
            前のページに戻る
          </button>
          <Link to="/" className="back-home-link">
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
};