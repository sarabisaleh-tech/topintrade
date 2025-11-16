import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function AdminPanel({ onBack }) {
  const [inviteCodes, setInviteCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [showCode, setShowCode] = useState(false);

  // بارگذاری لیست کدهای دعوت
  async function loadInviteCodes() {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/invite-codes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInviteCodes(data.codes);
      }
    } catch (error) {
      console.error('Error loading invite codes:', error);
    }
    setLoading(false);
  }

  // ساخت کد دعوت جدید
  async function createInviteCode() {
    setCreating(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/invite-codes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNewCode(data.code);
        setShowCode(true);
        loadInviteCodes(); // بارگذاری مجدد لیست
      }
    } catch (error) {
      console.error('Error creating invite code:', error);
    }
    setCreating(false);
  }

  // حذف کد دعوت
  async function deleteInviteCode(id) {
    if (!confirm('آیا مطمئن هستید؟')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/invite-codes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        loadInviteCodes(); // بارگذاری مجدد لیست
      }
    } catch (error) {
      console.error('Error deleting invite code:', error);
    }
  }

  // کپی کردن کد
  function copyCode(code) {
    navigator.clipboard.writeText(code);
    alert('کد کپی شد!');
  }

  useEffect(() => {
    loadInviteCodes();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-gray-700 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
                >
                  ← بازگشت
                </button>
              )}
              <h2 className="text-2xl font-bold text-white">پنل مدیریت (Admin)</h2>
            </div>
            <button
              onClick={createInviteCode}
              disabled={creating}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-2 px-6 rounded-lg transition transform hover:scale-105 disabled:opacity-50 disabled:transform-none shadow-lg"
            >
              {creating ? 'در حال ساخت...' : '➕ ساخت کد دعوت'}
            </button>
          </div>

      {/* کد جدید ساخته شده */}
      {showCode && newCode && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">کد دعوت جدید:</p>
              <p className="text-2xl font-bold text-green-400 tracking-wider">{newCode}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyCode(newCode)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
              >
                📋 کپی
              </button>
              <button
                onClick={() => {
                  setShowCode(false);
                  setNewCode('');
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* لیست کدهای دعوت */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">لیست کدهای دعوت</h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="text-gray-400 mt-2">در حال بارگذاری...</p>
          </div>
        ) : inviteCodes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            هیچ کد دعوتی وجود ندارد
          </div>
        ) : (
          <div className="space-y-3">
            {inviteCodes.map((code) => (
              <div
                key={code.id}
                className={`bg-gray-900/50 border rounded-lg p-4 ${
                  code.is_used ? 'border-gray-700 opacity-60' : 'border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-white tracking-wider">{code.code}</span>
                      {code.is_used ? (
                        <span className="bg-red-900/30 text-red-400 text-xs px-2 py-1 rounded">
                          استفاده شده
                        </span>
                      ) : (
                        <span className="bg-green-900/30 text-green-400 text-xs px-2 py-1 rounded">
                          فعال
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      <p>ساخته شده: {new Date(code.created_at).toLocaleString('fa-IR')}</p>
                      {code.is_used && (
                        <>
                          <p>استفاده شده توسط: {code.used_by_email || 'نامشخص'}</p>
                          <p>تاریخ استفاده: {new Date(code.used_at).toLocaleString('fa-IR')}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyCode(code.code)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition"
                      title="کپی کد"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => deleteInviteCode(code.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition"
                      title="حذف کد"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* آمار */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">کل کدها</p>
          <p className="text-2xl font-bold text-white">{inviteCodes.length}</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">استفاده نشده</p>
          <p className="text-2xl font-bold text-white">
            {inviteCodes.filter(c => !c.is_used).length}
          </p>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
