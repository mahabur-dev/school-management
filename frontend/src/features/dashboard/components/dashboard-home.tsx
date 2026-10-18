import { AppIcon } from '@/components/ui/app-icon';
import { dashboardMetrics, recentActivity, upcomingEvents } from '../dashboard-data';
import styles from './dashboard-home.module.css';

export function DashboardHome() {
  return (
    <main className={styles.dashboard}>
      <section className={styles.welcomeRow}>
        <div>
          <span className={styles.date}>Saturday, 18 October 2026</span>
          <h1>Good morning, Admin</h1>
          <p>Here&apos;s what&apos;s happening across your school today.</p>
        </div>
        <button type="button" className={styles.primaryAction} disabled title="Student creation will be connected with the Students module">
          <AppIcon name="plus" />
          <span>Add new student</span>
        </button>
      </section>

      <section className={styles.metricsGrid} aria-label="School overview">
        {dashboardMetrics.map((metric) => (
          <article key={metric.label} className={`${styles.metricCard} ${styles[metric.tone]}`}>
            <div className={styles.metricHeader}>
              <span className={styles.metricIcon}><AppIcon name={metric.icon} /></span>
              <span className={styles.metricChange}>{metric.change} <AppIcon name="arrow-up-right" /></span>
            </div>
            <strong className={styles.metricValue}>{metric.value}</strong>
            <span className={styles.metricLabel}>{metric.label}</span>
            <small>{metric.note}</small>
          </article>
        ))}
      </section>

      <section className={styles.primaryGrid}>
        <article className={`${styles.panel} ${styles.performancePanel}`}>
          <PanelHeader title="Attendance overview" description="Average attendance across all grades" action="Last 7 days" />
          <div className={styles.chartLegend}>
            <span><i className={styles.blueDot} /> Present</span>
            <span><i className={styles.amberDot} /> Late</span>
          </div>
          <div className={styles.chartWrap}>
            <div className={styles.chartAxis} aria-hidden="true"><span>100%</span><span>75%</span><span>50%</span><span>25%</span></div>
            <svg className={styles.lineChart} viewBox="0 0 700 235" role="img" aria-label="Attendance trend from Monday to Saturday">
              <defs>
                <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#0b73f6" stopOpacity="0.22" />
                  <stop offset="1" stopColor="#0b73f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className={styles.gridLine} d="M0 28H700M0 83H700M0 138H700M0 193H700" />
              <path className={styles.areaPath} d="M0 155 C70 145 86 108 145 116 S235 165 292 115 S388 61 438 90 S532 151 580 106 S655 65 700 47 V220 H0Z" />
              <path className={styles.mainLine} d="M0 155 C70 145 86 108 145 116 S235 165 292 115 S388 61 438 90 S532 151 580 106 S655 65 700 47" />
              <path className={styles.secondLine} d="M0 179 C74 168 95 154 150 158 S245 184 300 157 S385 139 445 146 S540 170 590 145 S660 126 700 115" />
              <circle className={styles.chartPoint} cx="438" cy="90" r="5" />
              <g className={styles.chartTooltip}>
                <rect x="401" y="38" width="75" height="38" rx="9" />
                <text x="438" y="53" textAnchor="middle">Thursday</text>
                <text x="438" y="68" textAnchor="middle">94.8%</text>
              </g>
            </svg>
            <div className={styles.chartDays} aria-hidden="true"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>
          </div>
        </article>

        <article className={`${styles.panel} ${styles.distributionPanel}`}>
          <PanelHeader title="Student distribution" description="Current enrollment" action="All grades" />
          <div className={styles.donutWrap}>
            <div className={styles.donut} role="img" aria-label="54 percent boys and 46 percent girls">
              <div><strong>1,738</strong><span>Total students</span></div>
            </div>
          </div>
          <div className={styles.distributionLegend}>
            <div><span><i className={styles.blueDot} /> Boys</span><strong>938</strong><small>54%</small></div>
            <div><span><i className={styles.amberDot} /> Girls</span><strong>800</strong><small>46%</small></div>
          </div>
          <div className={styles.capacity}>
            <div><span>Enrollment capacity</span><strong>87%</strong></div>
            <span className={styles.capacityTrack}><i /></span>
          </div>
        </article>
      </section>

      <section className={styles.secondaryGrid}>
        <article className={styles.panel}>
          <PanelHeader title="Upcoming events" description="What’s next on the calendar" action="View calendar" />
          <div className={styles.eventList}>
            {upcomingEvents.map((event) => (
              <div key={event.title} className={styles.eventItem}>
                <span className={`${styles.eventDate} ${styles[event.tone]}`}><strong>{event.day}</strong><small>{event.month}</small></span>
                <span className={styles.eventCopy}><strong>{event.title}</strong><small>{event.time}</small></span>
                <span className={styles.eventAudience}>{event.audience}</span>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <PanelHeader title="Recent activity" description="Latest updates from your school" action="View all" />
          <div className={styles.activityList}>
            {recentActivity.map((activity) => (
              <div key={activity.title} className={styles.activityItem}>
                <span className={`${styles.activityAvatar} ${styles[activity.tone]}`}>{activity.initials}</span>
                <span className={styles.activityCopy}><strong>{activity.title}</strong><small>{activity.detail}</small></span>
                <time>{activity.time}</time>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function PanelHeader({ title, description, action }: { title: string; description: string; action: string }) {
  return (
    <div className={styles.panelHeader}>
      <div><h2>{title}</h2><p>{description}</p></div>
      <button type="button" disabled title={`${action} will be connected with its module`}>
        {action}<AppIcon name="chevron-down" />
      </button>
    </div>
  );
}
