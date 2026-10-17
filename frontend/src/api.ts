export type AppointmentStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'

export interface Patient {
  id: number
  full_name: string
  identification: string
  email: string
  phone: string
}

export interface Doctor {
  id: number
  full_name: string
  specialty: string
  email: string
}

export interface Appointment {
  id: number
  patient_id: number
  doctor_id: number
  appointment_date: string
  reason: string
  status: AppointmentStatus
}

export interface AppointmentInput {
  patient_id: number
  doctor_id: number
  appointment_date: string
  reason: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let detail = `Error ${response.status}: no se pudo completar la solicitud.`
    try {
      const body = await response.json() as { detail?: string }
      if (body.detail) detail = body.detail
    } catch {
      // Keep the status-based message when the server response is not JSON.
    }
    throw new Error(detail)
  }

  return response.json() as Promise<T>
}

export const api = {
  patients: () => request<Patient[]>('/patients'),
  doctors: () => request<Doctor[]>('/doctors'),
  appointments: () => request<Appointment[]>('/appointments'),
  createPatient: (data: Omit<Patient, 'id'>) => request<Patient>('/patients', { method: 'POST', body: JSON.stringify(data) }),
  createDoctor: (data: Omit<Doctor, 'id'>) => request<Doctor>('/doctors', { method: 'POST', body: JSON.stringify(data) }),
  createAppointment: (data: AppointmentInput) => request<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  updateAppointmentStatus: (id: number, status: AppointmentStatus) => request<Appointment>(`/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
}
