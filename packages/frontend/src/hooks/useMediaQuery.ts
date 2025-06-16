import { useState, useEffect } from "react";

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    // 初期値を設定
    setMatches(media.matches);

    // リスナーを定義
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // リスナーを追加
    if (media.addListener) {
      media.addListener(listener);
    } else {
      media.addEventListener("change", listener);
    }

    // クリーンアップ
    return () => {
      if (media.removeListener) {
        media.removeListener(listener);
      } else {
        media.removeEventListener("change", listener);
      }
    };
  }, [query]);

  return matches;
};
