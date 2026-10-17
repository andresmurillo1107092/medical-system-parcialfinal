import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  HeartPulse,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Stethoscope,
  UserRoundPlus,
  Users,
  X,
} from 'lucide-react'
import {
  api,
  type Appointment,
  type AppointmentStatus,
  type Doctor,
  type Patient,
} from './api'
import './App.css'

type Section = 'resumen' | 'agenda' | 'pacientes' | 'medicos'
type Modal = 'cita' | 'paciente' | 'medico' | null
type AppointmentDraft = {
  patient_id: number
  doctor_id: number
  appointment_date: string
  reason: string
}

const statusLabels: Record<AppointmentStatus, string> = {
  PENDING: 'Pendiente',
  COMPLETED: 'Atendida',
  CANCELLED: 'Cancelada',
}

function localDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value))
}

function getAvailableTimes(doctorId: number, date: string, appointments: Appointment[]) {
  const occupied = new Set(
    appointments
      .filter(
        (appointment) =>
          appointment.doctor_id === doctorId &&
          appointment.status !== 'CANCELLED' &&
          appointment.appointment_date.slice(0, 10) === date,
      )
      .map((appointment) => appointment.appointment_date.slice(11, 16)),
  )

  return Array.from({ length: 19 }, (_, index) => {
    const minutes = 8 * 60 + index * 30
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  }).filter((time) => !occupied.has(time))
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function App() {
  const [section, setSection] = useState<Section>('resumen')
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedDate, setSelectedDate] = useState(localDateValue(new Date()))
  const [availabilityDoctorId, setAvailabilityDoctorId] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | AppointmentStatus>('ALL')
  const [modal, setModal] = useState<Modal>(null)
  const [preselectedDoctor, setPreselectedDoctor] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([api.patients(), api.doctors(), api.appointments()])
      .then(([patientRows, doctorRows, appointmentRows]) => {
        if (!active) return
        setPatients(patientRows)
        setDoctors(doctorRows)
        setAppointments(appointmentRows)
        setAvailabilityDoctorId(doctorRows[0]?.id ?? 0)
        setError('')
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : 'No se pudo conectar con el servidor.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const todaysAppointments = appointments
    .filter((appointment) => appointment.appointment_date.slice(0, 10) === selectedDate)
    .sort((left, right) => left.appointment_date.localeCompare(right.appointment_date))

  const visibleAppointments = todaysAppointments.filter((appointment) => {
    const patient = patients.find((item) => item.id === appointment.patient_id)
    const doctor = doctors.find((item) => item.id === appointment.doctor_id)
    const query = search.trim().toLocaleLowerCase('es')
    const matchesSearch =
      !query ||
      patient?.full_name.toLocaleLowerCase('es').includes(query) ||
      doctor?.full_name.toLocaleLowerCase('es').includes(query) ||
      appointment.reason.toLocaleLowerCase('es').includes(query)
    return matchesSearch && (statusFilter === 'ALL' || appointment.status === statusFilter)
  })

  const pendingCount = appointments.filter((appointment) => appointment.status === 'PENDING').length
  const completedToday = todaysAppointments.filter((appointment) => appointment.status === 'COMPLETED').length
  const availabilityDoctor = doctors.find((doctor) => doctor.id === availabilityDoctorId) ?? doctors[0]
  const freeTimes = availabilityDoctor
    ? getAvailableTimes(availabilityDoctor.id, selectedDate, appointments).slice(0, 4)
    : []

  function changeDate(days: number) {
    const nextDate = new Date(`${selectedDate}T12:00:00`)
    nextDate.setDate(nextDate.getDate() + days)
    setSelectedDate(localDateValue(nextDate))
  }

  async function saveAppointment(draft: AppointmentDraft) {
    const created = await api.createAppointment(draft)
    setAppointments((current) => [...current, created])
    setModal(null)
    setNotice('La cita quedó agendada y el horario fue reservado.')
  }

  async function savePatient(draft: Omit<Patient, 'id'>) {
    const created = await api.createPatient(draft)
    setPatients((current) => [...current, created])
    setModal(null)
    setNotice('Paciente registrado correctamente.')
  }

  async function saveDoctor(draft: Omit<Doctor, 'id'>) {
    const created = await api.createDoctor(draft)
    setDoctors((current) => [...current, created])
    setAvailabilityDoctorId((current) => current || created.id)
    setModal(null)
    setNotice('Profesional agregado correctamente.')
  }

  async function changeAppointmentStatus(appointmentId: number, status: AppointmentStatus) {
    try {
      const updated = await api.updateAppointmentStatus(appointmentId, status)
      setAppointments((current) =>
        current.map((appointment) => (appointment.id === appointmentId ? updated : appointment)),
      )
      setNotice(`Cita marcada como ${statusLabels[status].toLocaleLowerCase('es')}.`)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo actualizar la cita.')
    }
  }

  function openAppointment(doctorId?: number) {
    setPreselectedDoctor(doctorId)
    setModal('cita')
  }

  function navigate(nextSection: Section) {
    setSection(nextSection)
    setMobileNavOpen(false)
    setSearch('')
    setStatusFilter('ALL')
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#inicio" onClick={() => navigate('resumen')}>
          <span className="brand-mark"><HeartPulse size={21} strokeWidth={2.2} /></span>
          <span className="brand-name">savia<span>salud</span></span>
        </a>
        <div className="clinic-switcher">
          <span className="clinic-avatar">SM</span>
          <span className="clinic-copy"><strong>San Miguel</strong><small>Centro médico</small></span>
          <ChevronDown size={16} />
        </div>
        <p className="nav-label">GESTIÓN</p>
        <nav className="side-nav" aria-label="Navegación principal">
          <NavButton active={section === 'resumen'} icon={<LayoutDashboard size={18} />} label="Resumen" onClick={() => navigate('resumen')} />
          <NavButton active={section === 'agenda'} icon={<CalendarDays size={18} />} label="Agenda" count={todaysAppointments.length} onClick={() => navigate('agenda')} />
          <NavButton active={section === 'pacientes'} icon={<Users size={18} />} label="Pacientes" onClick={() => navigate('pacientes')} />
          <NavButton active={section === 'medicos'} icon={<Stethoscope size={18} />} label="Profesionales" onClick={() => navigate('medicos')} />
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help"><span className="help-icon"><Activity size={17} /></span><span><strong>Jornada en curso</strong><small>Agenda del día activa</small></span></div>
          <div className="user-profile"><span className="user-avatar">AM</span><span><strong>Andrés Murillo</strong><small>Administrador</small></span><button className="icon-button user-menu" title="Opciones de perfil"><Menu size={17} /></button></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" title="Abrir menú" onClick={() => setMobileNavOpen((open) => !open)}><Menu size={20} /></button>
          <div className="breadcrumb">Centro médico <span>/</span> <strong>{sectionTitle(section)}</strong></div>
          <div className="topbar-actions"><span className="live-dot" /> <span className="topbar-date">{formatLongDate(selectedDate)}</span></div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><p className="eyebrow">CENTRO MÉDICO SAN MIGUEL</p><h1>{sectionHeading(section)}</h1><p className="page-subtitle">{sectionSubtitle(section)}</p></div>
            <div className="heading-actions"><button className="button button-secondary" onClick={() => setModal('paciente')}><UserRoundPlus size={17} /> Nuevo paciente</button><button className="button button-primary" onClick={() => openAppointment()}><Plus size={18} /> Agendar cita</button></div>
          </div>

          {error && <div className="notice notice-error"><CircleAlert size={18} /><span>{error}</span><button className="icon-button" title="Cerrar aviso" onClick={() => setError('')}><X size={16} /></button></div>}
          {notice && <div className="notice notice-success"><Check size={17} /><span>{notice}</span><button className="icon-button" title="Cerrar aviso" onClick={() => setNotice('')}><X size={16} /></button></div>}

          {section === 'pacientes' ? (
            <PatientsView patients={patients} search={search} onSearch={setSearch} onAdd={() => setModal('paciente')} />
          ) : section === 'medicos' ? (
            <DoctorsView doctors={doctors} appointments={appointments} selectedDate={selectedDate} onAdd={() => setModal('medico')} onSchedule={openAppointment} />
          ) : (
            <>
              <section className="stats-grid" aria-label="Resumen de citas">
                <StatCard label="Citas del día" value={todaysAppointments.length} hint={formatShortDate(selectedDate)} icon={<CalendarDays size={18} />} tone="green" />
                <StatCard label="Por confirmar" value={todaysAppointments.filter((item) => item.status === 'PENDING').length} hint={`${pendingCount} pendientes en total`} icon={<Clock3 size={18} />} tone="yellow" />
                <StatCard label="Atendidas" value={completedToday} hint="Durante esta jornada" icon={<Check size={18} />} tone="coral" />
                <StatCard label="Profesionales" value={doctors.length} hint={`${patients.length} pacientes registrados`} icon={<Stethoscope size={18} />} tone="lilac" />
              </section>
              <section className="workspace-grid">
                <div className="appointments-panel">
                  <div className="panel-heading">
                    <div><p className="eyebrow">CONTROL DE CONSULTAS</p><h2>{section === 'agenda' ? 'Agenda médica' : 'Citas del día'}</h2></div>
                    <button className="button button-light" onClick={() => navigate('agenda')}>Ver agenda <ArrowLeft className="arrow-right" size={15} /></button>
                  </div>
                  <div className="agenda-toolbar">
                    <div className="date-control"><button className="icon-button" aria-label="Día anterior" onClick={() => changeDate(-1)}><ChevronLeft size={18} /></button><button className="date-label" onClick={() => setSelectedDate(localDateValue(new Date()))}>{formatDayLabel(selectedDate)}</button><button className="icon-button" aria-label="Día siguiente" onClick={() => changeDate(1)}><ChevronRight size={18} /></button><button className="today-button" onClick={() => setSelectedDate(localDateValue(new Date()))}>Hoy</button></div>
                    <label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar paciente o médico" /></label>
                  </div>
                  <div className="filter-row"><span className="filter-caption">Estado</span><FilterButton active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')}>Todas</FilterButton><FilterButton active={statusFilter === 'PENDING'} onClick={() => setStatusFilter('PENDING')}>Pendientes</FilterButton><FilterButton active={statusFilter === 'COMPLETED'} onClick={() => setStatusFilter('COMPLETED')}>Atendidas</FilterButton><FilterButton active={statusFilter === 'CANCELLED'} onClick={() => setStatusFilter('CANCELLED')}>Canceladas</FilterButton></div>
                  {loading ? <div className="empty-state"><span className="loading-ring" /><p>Cargando agenda…</p></div> : visibleAppointments.length === 0 ? <EmptyAppointments onAdd={() => openAppointment()} hasAny={todaysAppointments.length > 0} /> : <AppointmentTable appointments={visibleAppointments} patients={patients} doctors={doctors} onStatusChange={changeAppointmentStatus} />}
                </div>
                <aside className="availability-panel">
                  <div className="panel-heading compact"><div><p className="eyebrow">DISPONIBILIDAD</p><h2>Espacios libres</h2></div><span className="availability-icon"><Clock3 size={18} /></span></div>
                  {doctors.length === 0 ? <div className="availability-empty"><p>Aún no hay profesionales registrados.</p><button className="text-action" onClick={() => setModal('medico')}>Agregar profesional <Plus size={14} /></button></div> : <>
                    <label className="select-label" htmlFor="availability-doctor">Profesional</label><select id="availability-doctor" className="field-control availability-select" value={availabilityDoctor?.id ?? ''} onChange={(event) => setAvailabilityDoctorId(Number(event.target.value))}>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.full_name}</option>)}</select>
                    <div className="slots-date"><span>{formatDayLabel(selectedDate)}</span><span>30 min</span></div>
                    <div className="slot-list">{freeTimes.length ? freeTimes.map((time) => <button key={time} className="slot-button" onClick={() => openAppointment(availabilityDoctor.id)}><span>{time}</span><Plus size={15} /></button>) : <p className="muted-copy">No hay espacios libres para mostrar en esta fecha.</p>}</div>
                    <p className="panel-footnote">Horarios de consulta · 8:00 a. m. – 5:00 p. m.</p>
                  </>}
                </aside>
              </section>
            </>
          )}
        </div>
      </main>

      {modal === 'cita' && <AppointmentModal patients={patients} doctors={doctors} appointments={appointments} initialDate={selectedDate} preselectedDoctor={preselectedDoctor} onClose={() => setModal(null)} onSave={saveAppointment} onCreatePatient={() => setModal('paciente')} onCreateDoctor={() => setModal('medico')} />}
      {modal === 'paciente' && <PatientModal onClose={() => setModal(null)} onSave={savePatient} />}
      {modal === 'medico' && <DoctorModal onClose={() => setModal(null)} onSave={saveDoctor} />}
    </div>
  )
}

function sectionTitle(section: Section) {
  return { resumen: 'Resumen', agenda: 'Agenda', pacientes: 'Pacientes', medicos: 'Profesionales' }[section]
}

function sectionHeading(section: Section) {
  return { resumen: 'Agenda clínica', agenda: 'Agenda de citas', pacientes: 'Pacientes', medicos: 'Profesionales de salud' }[section]
}

function sectionSubtitle(section: Section) {
  return {
    resumen: 'Organiza las consultas y conoce el ritmo de atención de hoy.',
    agenda: 'Consulta, filtra y actualiza el estado de cada cita.',
    pacientes: 'Información de las personas atendidas en el centro médico.',
    medicos: 'Equipo profesional y disponibilidad para consulta.',
  }[section]
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`))
}

function formatDayLabel(value: string) {
  return new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`))
}

function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: ReactNode; label: string; count?: number; onClick: () => void }) {
  return <button className={`nav-button ${active ? 'nav-active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{count !== undefined && count > 0 && <small>{count}</small>}</button>
}

function StatCard({ label, value, hint, icon, tone }: { label: string; value: number; hint: string; icon: ReactNode; tone: string }) {
  return <article className={`stat-card stat-${tone}`}><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong className="stat-value">{value}</strong><span className="stat-hint">{hint}</span></article>
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button className={`filter-button ${active ? 'filter-active' : ''}`} onClick={onClick}>{children}</button>
}

function EmptyAppointments({ onAdd, hasAny }: { onAdd: () => void; hasAny: boolean }) {
  return <div className="empty-state"><span className="empty-icon"><CalendarPlus size={23} /></span><h3>{hasAny ? 'No hay resultados con estos filtros' : 'Tu agenda está despejada'}</h3><p>{hasAny ? 'Prueba otro término o estado para encontrar la cita.' : 'Registra una consulta para organizar la atención del día.'}</p>{!hasAny && <button className="button button-primary" onClick={onAdd}><Plus size={17} /> Agendar primera cita</button>}</div>
}

function AppointmentTable({ appointments, patients, doctors, onStatusChange }: { appointments: Appointment[]; patients: Patient[]; doctors: Doctor[]; onStatusChange: (id: number, status: AppointmentStatus) => void }) {
  return <div className="table-wrap"><table className="appointment-table"><thead><tr><th>Hora</th><th>Paciente</th><th>Profesional</th><th>Motivo</th><th>Estado</th></tr></thead><tbody>{appointments.map((appointment) => {
    const patient = patients.find((item) => item.id === appointment.patient_id)
    const doctor = doctors.find((item) => item.id === appointment.doctor_id)
    return <tr key={appointment.id}>
      <td><span className="time-cell"><Clock3 size={14} />{formatTime(appointment.appointment_date)}</span></td>
      <td><span className="person-cell"><span className="person-avatar patient-avatar">{initials(patient?.full_name ?? 'Paciente')}</span><span><strong>{patient?.full_name ?? `Paciente #${appointment.patient_id}`}</strong><small>{patient?.identification ?? 'Registro'}</small></span></span></td>
      <td><span className="doctor-cell"><strong>{doctor?.full_name ?? `Profesional #${appointment.doctor_id}`}</strong><small>{doctor?.specialty ?? 'Consulta médica'}</small></span></td>
      <td className="reason-cell">{appointment.reason}</td>
      <td><label className={`status-select status-${appointment.status.toLowerCase()}`}><span className="status-dot" /><select aria-label={`Estado de cita de ${patient?.full_name ?? 'paciente'}`} value={appointment.status} onChange={(event) => onStatusChange(appointment.id, event.target.value as AppointmentStatus)}><option value="PENDING">Pendiente</option><option value="COMPLETED">Atendida</option><option value="CANCELLED">Cancelada</option></select><ChevronDown size={13} /></label></td>
    </tr>
  })}</tbody></table></div>
}

function PatientsView({ patients, search, onSearch, onAdd }: { patients: Patient[]; search: string; onSearch: (value: string) => void; onAdd: () => void }) {
  const visible = patients.filter((patient) => `${patient.full_name} ${patient.identification} ${patient.email}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')))
  return <section className="directory-panel"><div className="directory-toolbar"><div><p className="eyebrow">REGISTRO CLÍNICO</p><h2>{patients.length} pacientes</h2></div><div className="directory-actions"><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Nombre, documento o correo" /></label><button className="button button-primary" onClick={onAdd}><Plus size={17} /> Nuevo paciente</button></div></div>{visible.length === 0 ? <div className="empty-state directory-empty"><span className="empty-icon"><Users size={23} /></span><h3>{patients.length ? 'No se encontraron pacientes' : 'Comienza el registro de pacientes'}</h3><p>{patients.length ? 'Revisa el criterio de búsqueda.' : 'Agrega pacientes para poder asignarlos a una cita.'}</p>{!patients.length && <button className="button button-primary" onClick={onAdd}><UserRoundPlus size={17} /> Registrar paciente</button>}</div> : <div className="table-wrap"><table className="directory-table"><thead><tr><th>Paciente</th><th>Documento</th><th>Correo electrónico</th><th>Teléfono</th></tr></thead><tbody>{visible.map((patient) => <tr key={patient.id}><td><span className="person-cell"><span className="person-avatar patient-avatar">{initials(patient.full_name)}</span><span><strong>{patient.full_name}</strong><small>Paciente #{String(patient.id).padStart(4, '0')}</small></span></span></td><td>{patient.identification}</td><td>{patient.email}</td><td>{patient.phone}</td></tr>)}</tbody></table></div>}</section>
}

function DoctorsView({ doctors, appointments, selectedDate, onAdd, onSchedule }: { doctors: Doctor[]; appointments: Appointment[]; selectedDate: string; onAdd: () => void; onSchedule: (id: number) => void }) {
  return <section className="directory-panel"><div className="directory-toolbar"><div><p className="eyebrow">EQUIPO ASISTENCIAL</p><h2>{doctors.length} profesionales</h2></div><button className="button button-primary" onClick={onAdd}><Plus size={17} /> Agregar profesional</button></div>{doctors.length === 0 ? <div className="empty-state directory-empty"><span className="empty-icon"><Stethoscope size={23} /></span><h3>Registra el equipo médico</h3><p>La disponibilidad se calcula según las citas agendadas.</p><button className="button button-primary" onClick={onAdd}><Plus size={17} /> Agregar profesional</button></div> : <div className="doctor-grid">{doctors.map((doctor, index) => {
    const available = getAvailableTimes(doctor.id, selectedDate, appointments).length
    return <article className="doctor-card" key={doctor.id}><div className={`doctor-avatar doctor-tone-${index % 4}`}>{initials(doctor.full_name)}</div><div className="doctor-card-copy"><h3>{doctor.full_name}</h3><p>{doctor.specialty}</p></div><div className="doctor-contact"><span>{doctor.email}</span><span className="doctor-slots"><span className="availability-dot" /> {available} horarios libres hoy</span></div><button className="button button-secondary doctor-action" onClick={() => onSchedule(doctor.id)}><CalendarPlus size={16} /> Agendar con este profesional</button></article>
  })}</div>}</section>
}

function ModalFrame({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><p className="eyebrow">CENTRO MÉDICO SAN MIGUEL</p><h2 id="modal-title">{title}</h2><p>{description}</p></div><button className="icon-button modal-close" title="Cerrar" onClick={onClose}><X size={19} /></button></div>{children}</section></div>
}

function AppointmentModal({ patients, doctors, appointments, initialDate, preselectedDoctor, onClose, onSave, onCreatePatient, onCreateDoctor }: { patients: Patient[]; doctors: Doctor[]; appointments: Appointment[]; initialDate: string; preselectedDoctor?: number; onClose: () => void; onSave: (draft: AppointmentDraft) => Promise<void>; onCreatePatient: () => void; onCreateDoctor: () => void }) {
  const [patientId, setPatientId] = useState(patients[0]?.id ?? 0)
  const [doctorId, setDoctorId] = useState(preselectedDoctor ?? doctors[0]?.id ?? 0)
  const [date, setDate] = useState(initialDate)
  const times = doctorId ? getAvailableTimes(doctorId, date, appointments) : []
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!patientId || !doctorId) {
      setFormError('Registra al menos un paciente y un profesional para agendar.')
      return
    }
    if (!time) {
      setFormError('Selecciona un horario disponible.')
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      await onSave({ patient_id: patientId, doctor_id: doctorId, appointment_date: `${date}T${time}:00`, reason })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar la cita.')
    } finally {
      setSubmitting(false)
    }
  }

  return <ModalFrame title="Agendar una cita" description="Asigna un profesional, una persona y un espacio disponible." onClose={onClose}><form className="modal-form" onSubmit={submit}>
    <div className="form-field"><label htmlFor="appointment-patient">Paciente</label><div className="field-with-action"><select id="appointment-patient" className="field-control" required value={patientId || ''} onChange={(event) => setPatientId(Number(event.target.value))}><option value="" disabled>Selecciona un paciente</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.full_name} · {patient.identification}</option>)}</select><button type="button" className="field-action" title="Crear paciente" onClick={onCreatePatient}><Plus size={17} /></button></div></div>
    <div className="form-field"><label htmlFor="appointment-doctor">Profesional</label><div className="field-with-action"><select id="appointment-doctor" className="field-control" required value={doctorId || ''} onChange={(event) => { setDoctorId(Number(event.target.value)); setTime('') }}><option value="" disabled>Selecciona un profesional</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.full_name} · {doctor.specialty}</option>)}</select><button type="button" className="field-action" title="Crear profesional" onClick={onCreateDoctor}><Plus size={17} /></button></div></div>
    <div className="form-field"><label htmlFor="appointment-date">Fecha</label><input id="appointment-date" className="field-control" type="date" required min={localDateValue(new Date())} value={date} onChange={(event) => { setDate(event.target.value); setTime('') }} /></div>
    <div className="form-field"><label>Horario disponible</label><div className="time-options">{times.length ? times.slice(0, 10).map((slot) => <button key={slot} type="button" className={`time-option ${time === slot ? 'time-option-active' : ''}`} onClick={() => setTime(slot)}>{slot}</button>) : <p className="muted-copy">No hay espacios para esta fecha. Elige otro profesional o día.</p>}</div></div>
    <div className="form-field"><label htmlFor="appointment-reason">Motivo de consulta</label><input id="appointment-reason" className="field-control" required maxLength={255} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej. Control general" /></div>
    {formError && <p className="form-error"><CircleAlert size={15} />{formError}</p>}
    <div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button><button className="button button-primary" disabled={submitting || !patients.length || !doctors.length}>{submitting ? 'Guardando…' : <><CalendarPlus size={16} /> Confirmar cita</>}</button></div>
  </form></ModalFrame>
}

function PatientModal({ onClose, onSave }: { onClose: () => void; onSave: (draft: Omit<Patient, 'id'>) => Promise<void> }) {
  const [form, setForm] = useState({ full_name: '', identification: '', email: '', phone: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSubmitting(true); setError(''); try { await onSave(form) } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo registrar el paciente.') } finally { setSubmitting(false) } }
  return <ModalFrame title="Registrar paciente" description="Completa los datos de identificación y contacto." onClose={onClose}><form className="modal-form" onSubmit={submit}><div className="form-field"><label htmlFor="patient-name">Nombre completo</label><input id="patient-name" className="field-control" required maxLength={150} autoFocus value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} placeholder="Nombre y apellidos" /></div><div className="form-field"><label htmlFor="patient-id">Documento de identidad</label><input id="patient-id" className="field-control" required maxLength={50} value={form.identification} onChange={(event) => setForm({ ...form, identification: event.target.value })} placeholder="Número de documento" /></div><div className="form-field"><label htmlFor="patient-email">Correo electrónico</label><input id="patient-email" className="field-control" required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="nombre@correo.com" /></div><div className="form-field"><label htmlFor="patient-phone">Teléfono</label><input id="patient-phone" className="field-control" required type="tel" maxLength={20} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Número de contacto" /></div>{error && <p className="form-error"><CircleAlert size={15} />{error}</p>}<div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button><button className="button button-primary" disabled={submitting}>{submitting ? 'Guardando…' : <><UserRoundPlus size={16} /> Guardar paciente</>}</button></div></form></ModalFrame>
}

function DoctorModal({ onClose, onSave }: { onClose: () => void; onSave: (draft: Omit<Doctor, 'id'>) => Promise<void> }) {
  const [form, setForm] = useState({ full_name: '', specialty: '', email: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSubmitting(true); setError(''); try { await onSave(form) } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo agregar el profesional.') } finally { setSubmitting(false) } }
  return <ModalFrame title="Agregar profesional" description="Registra al profesional para asignarle citas." onClose={onClose}><form className="modal-form" onSubmit={submit}><div className="form-field"><label htmlFor="doctor-name">Nombre completo</label><input id="doctor-name" className="field-control" required maxLength={150} autoFocus value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} placeholder="Nombre y apellidos" /></div><div className="form-field"><label htmlFor="doctor-specialty">Especialidad</label><input id="doctor-specialty" className="field-control" required maxLength={100} value={form.specialty} onChange={(event) => setForm({ ...form, specialty: event.target.value })} placeholder="Ej. Medicina general" /></div><div className="form-field"><label htmlFor="doctor-email">Correo electrónico</label><input id="doctor-email" className="field-control" required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="profesional@centro.com" /></div>{error && <p className="form-error"><CircleAlert size={15} />{error}</p>}<div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button><button className="button button-primary" disabled={submitting}>{submitting ? 'Guardando…' : <><Stethoscope size={16} /> Guardar profesional</>}</button></div></form></ModalFrame>
}

export default App
