import { Link } from 'react-router-dom'
import { Lockup, ProductName } from '../brand/BrandMark'

/**
 * Future role interfaces (/faculty, /hod, /admin) will each get their own layout under src/roles/<role>/.
 * They are deliberately not built in the student-first phase; this only reserves the routes.
 */
export function RolePlaceholder({ role }: { role: string }) {
  return (
    <main className="paper" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 520, textAlign: 'center', display: 'grid', gap: 14, justifyItems: 'center' }}>
        <ProductName />
        <h1 style={{ fontSize: 28 }}>{role} workspace</h1>
        <p className="muted">This interface is planned for a later phase. The platform is being built student-first; role-based interfaces will be added on this route without changing the student experience.</p>
        <Lockup compact />
        <Link className="btn btn-primary" to="/">Back to the portfolio platform</Link>
      </div>
    </main>
  )
}
