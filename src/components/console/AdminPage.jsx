import { useEffect, useState } from "react";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { fetchAdminUsers } from "../../lib/api.js";

export default function AdminPage() {
  const { t } = useLanguage();
  const a = t("console.admin");
  const [state, setState] = useState({ loading: true, data: null, error: null, offline: false });

  useEffect(() => {
    const token = window.localStorage.getItem("cw-token");
    if (!token) {
      setState({ loading: false, data: null, error: a.noToken, offline: false });
      return;
    }
    fetchAdminUsers(token).then((res) => {
      if (res.ok) setState({ loading: false, data: res.data, error: null, offline: false });
      else setState({ loading: false, data: null, error: res.error, offline: res.offline });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-medium mb-1">{a.title}</h1>
        <p className="text-white/50 mb-8">{a.subtitle}</p>

        {state.loading && <p className="text-white/50">{a.loading}</p>}

        {!state.loading && state.error && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-xl px-4 py-3 text-sm">
            ⚠️ {state.offline ? a.backendOffline : state.error}
          </div>
        )}

        {!state.loading && state.data && (
          <>
            <div className="grid sm:grid-cols-4 gap-4 mb-10">
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                <p className="text-xs text-white/40 mb-1">{a.totalUsers}</p>
                <p className="text-3xl font-semibold">{state.data.total}</p>
              </div>
              {["free", "pro", "enterprise"].map((plan) => (
                <div key={plan} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <p className="text-xs text-white/40 mb-1 capitalize">{plan}</p>
                  <p className="text-3xl font-semibold">{state.data.by_plan[plan] ?? 0}</p>
                </div>
              ))}
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/40 border-b border-white/10">
                    <th className="px-4 py-3 font-normal">{a.name}</th>
                    <th className="px-4 py-3 font-normal">{a.email}</th>
                    <th className="px-4 py-3 font-normal">{a.plan}</th>
                    <th className="px-4 py-3 font-normal">{a.provider}</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3">{u.name}</td>
                      <td className="px-4 py-3 text-white/60">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-lavender-deep/20 text-lavender-pill px-2 py-0.5 rounded-full capitalize">
                          {u.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/40 capitalize">{u.provider}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
