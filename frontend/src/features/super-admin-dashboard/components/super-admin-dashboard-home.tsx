import { AppIcon } from '@/components/ui/app-icon';
import {
  featureAdoption,
  platformActivity,
  platformMetrics,
  recentSchools,
} from '../super-admin-dashboard-data';
import styles from './super-admin-dashboard-home.module.css';

export function SuperAdminDashboardHome() {
  return (
    <main className={styles.dashboard}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Platform intelligence</span>
          <h1>Overview</h1>
          <p>Monitor every school, user and feature from one place.</p>
        </div>
        <button
          type="button"
          className={styles.createButton}
          disabled
          title="School creation form will be connected from the Schools module"
        >
          <AppIcon name="plus" />
          <span>Create school</span>
        </button>
      </header>

      <section className={styles.metricsGrid} aria-label="Platform metrics">
        {platformMetrics.map((metric) => (
          <article
            key={metric.label}
            className={`${styles.metricCard} ${styles[metric.tone]}`}
          >
            <div className={styles.metricTop}>
              <span className={styles.metricIcon}><AppIcon name={metric.icon} /></span>
              <span className={styles.change}>{metric.change}<AppIcon name="arrow-up-right" /></span>
            </div>
            <strong className={styles.metricValue}>{metric.value}</strong>
            <span className={styles.metricLabel}>{metric.label}</span>
            <small>{metric.detail}</small>
          </article>
        ))}
      </section>

      <div className={styles.contentGrid}>
        <div className={styles.mainColumn}>
          <section className={`${styles.panel} ${styles.growthPanel}`}>
            <PanelHeader
              title="Platform growth"
              subtitle="Schools and users onboarded over the last eight months"
              action="Last 8 months"
              chevron
            />

            <div className={styles.growthSummary}>
              <div><span>Total schools</span><strong>128</strong><small>+16 this quarter</small></div>
              <div><span>Total users</span><strong>24,836</strong><small>+1,842 this quarter</small></div>
              <div className={styles.legend}><span><i className={styles.blueDot} /> Schools</span><span><i className={styles.amberDot} /> Users</span></div>
            </div>

            <div className={styles.chart}>
              <div className={styles.yAxis} aria-hidden="true"><span>30K</span><span>20K</span><span>10K</span><span>0</span></div>
              <svg viewBox="0 0 760 250" role="img" aria-label="Platform school and user growth from March to October">
                <defs>
                  <linearGradient id="schoolGrowthArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#0b73f6" stopOpacity="0.22" />
                    <stop offset="1" stopColor="#0b73f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path className={styles.gridLines} d="M0 22H760M0 88H760M0 154H760M0 220H760" />
                <path className={styles.area} d="M0 188C65 184 76 161 128 157S212 171 260 135 353 118 402 101 492 113 540 76 627 70 673 48 726 34 760 30V220H0Z" />
                <path className={styles.schoolLine} d="M0 188C65 184 76 161 128 157S212 171 260 135 353 118 402 101 492 113 540 76 627 70 673 48 726 34 760 30" />
                <path className={styles.userLine} d="M0 207C69 199 79 186 130 183S211 190 264 168 351 158 405 141 492 149 544 123 626 115 679 96 729 83 760 77" />
                <circle className={styles.point} cx="540" cy="76" r="5" />
                <g className={styles.tooltip}>
                  <rect x="503" y="25" width="75" height="38" rx="9" />
                  <text x="540" y="41" textAnchor="middle">August</text>
                  <text x="540" y="56" textAnchor="middle">112 schools</text>
                </g>
              </svg>
              <div className={styles.xAxis} aria-hidden="true"><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span></div>
            </div>
          </section>

          <section className={`${styles.panel} ${styles.schoolsPanel}`}>
            <PanelHeader title="Recently added schools" subtitle="Latest tenant workspaces on the platform" action="View all schools" />
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>School</th><th>Administrator</th><th>Users</th><th>Status</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {recentSchools.map((school) => (
                    <tr key={school.slug}>
                      <td><span className={`${styles.schoolLogo} ${styles[school.tone]}`}>{school.initials}</span><span><strong>{school.name}</strong><small>{school.slug}.schoolsaas.app</small></span></td>
                      <td>{school.admin}</td>
                      <td>{school.users}</td>
                      <td><span className={`${styles.status} ${school.status === 'Active' ? styles.statusActive : styles.statusPending}`}>{school.status}</span></td>
                      <td><button type="button" disabled aria-label={`Open ${school.name}`}>•••</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className={styles.rightRail} aria-label="Platform insights">
          <section className={`${styles.panel} ${styles.healthCard}`}>
            <div className={styles.healthTop}>
              <span className={styles.healthIcon}><AppIcon name="pulse" /></span>
              <span className={styles.live}><i /> Live</span>
            </div>
            <span>Platform status</span>
            <strong>All systems operational</strong>
            <p>API, database and authentication services are healthy.</p>
            <div className={styles.healthBar}><i /></div>
            <div className={styles.healthMeta}><span>99.98% uptime</span><span>42 ms response</span></div>
          </section>

          <section className={`${styles.panel} ${styles.statusPanel}`}>
            <PanelHeader title="School status" subtitle="All registered tenants" action="This month" chevron />
            <div className={styles.donutRow}>
              <div className={styles.donut} role="img" aria-label="119 active and 9 suspended schools"><div><strong>128</strong><span>Schools</span></div></div>
              <div className={styles.statusLegend}>
                <div><span><i className={styles.blueDot} /> Active</span><strong>119</strong></div>
                <div><span><i className={styles.grayDot} /> Suspended</span><strong>9</strong></div>
              </div>
            </div>
          </section>

          <section className={`${styles.panel} ${styles.adoptionPanel}`}>
            <PanelHeader title="Feature adoption" subtitle="Usage across active schools" action="Manage" />
            <div className={styles.adoptionList}>
              {featureAdoption.map((feature) => (
                <div key={feature.label} className={styles.adoptionItem}>
                  <div><span>{feature.label}</span><strong>{feature.value}%</strong></div>
                  <span className={styles.track}><i className={styles[feature.tone]} style={{ width: `${feature.value}%` }} /></span>
                  <small>{feature.count}</small>
                </div>
              ))}
            </div>
          </section>

          <section className={`${styles.panel} ${styles.activityPanel}`}>
            <PanelHeader title="Recent activity" subtitle="Latest platform events" action="View all" />
            <div className={styles.activityList}>
              {platformActivity.map((activity) => (
                <div key={activity.title} className={styles.activityItem}>
                  <span className={`${styles.activityIcon} ${styles[activity.tone]}`}><AppIcon name={activity.icon} /></span>
                  <span><strong>{activity.title}</strong><small>{activity.detail}</small></span>
                  <time>{activity.time}</time>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function PanelHeader({
  title,
  subtitle,
  action,
  chevron = false,
}: {
  title: string;
  subtitle: string;
  action: string;
  chevron?: boolean;
}) {
  return (
    <header className={styles.panelHeader}>
      <div><h2>{title}</h2><p>{subtitle}</p></div>
      <button type="button" disabled title={`${action} will be connected with its module`}>
        {action}{chevron ? <AppIcon name="chevron-down" /> : null}
      </button>
    </header>
  );
}
