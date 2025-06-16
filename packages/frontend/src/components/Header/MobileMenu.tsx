import React from "react";
import { Link } from "react-router-dom";
import { Transition } from "@headlessui/react";
import type { User } from "@supabase/supabase-js";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  return (
    <Transition
      show={isOpen}
      enter="transition ease-out duration-200"
      enterFrom="opacity-0 -translate-y-1"
      enterTo="opacity-100 translate-y-0"
      leave="transition ease-in duration-150"
      leaveFrom="opacity-100 translate-y-0"
      leaveTo="opacity-0 -translate-y-1"
    >
      <div className="md:hidden absolute top-16 left-0 right-0 bg-white shadow-lg">
        <nav className="px-4 py-4 space-y-3">
          <Link
            to="/api-docs"
            onClick={onClose}
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
          >
            APIドキュメント
          </Link>

          {user ? (
            <>
              <Link
                to="/dashboard"
                onClick={onClose}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                ダッシュボード
              </Link>
              <Link
                to="/profile"
                onClick={onClose}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                プロフィール
              </Link>
              <Link
                to="/api-keys"
                onClick={onClose}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                APIキー管理
              </Link>
              <Link
                to="/usage"
                onClick={onClose}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                使用状況
              </Link>
              <hr className="my-2 border-gray-200" />
              <button
                onClick={() => {
                  onClose();
                  // ログアウト処理
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                ログアウト
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={onClose}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                ログイン
              </Link>
              <Link
                to="/signup"
                onClick={onClose}
                className="block px-3 py-2 rounded-md text-base font-medium text-white bg-purple-600 hover:bg-purple-700"
              >
                無料で始める
              </Link>
            </>
          )}
        </nav>
      </div>
    </Transition>
  );
};
