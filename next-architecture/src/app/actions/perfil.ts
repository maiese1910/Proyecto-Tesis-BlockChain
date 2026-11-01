'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function completarPerfilAction(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Sesión no autorizada o expirada. Inicia sesión nuevamente.' };
  }

  const nombre = formData.get('nombre')?.toString().trim();
  const tipo = formData.get('cedula_tipo')?.toString().toUpperCase() || 'V';
  const numeroRaw = formData.get('cedula_numero')?.toString().replace(/\D/g, '') || '';
  const carrera = formData.get('carrera')?.toString();
  const semestre = formData.get('semestre')?.toString() || '10mo';

  if (!nombre || nombre.split(' ').length < 2) {
    return { error: 'Debes ingresar tu nombre y apellido completo (tal como figura en tu documento oficial).' };
  }

  if (numeroRaw.length < 6 || numeroRaw.length > 9) {
    return { error: 'El número de cédula no es válido (debe tener entre 6 y 9 dígitos).' };
  }

  // Formatear cédula canónica con puntos (ej: V-28.315.101)
  const formattedNum = numeroRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cedulaCanonica = `${tipo}-${formattedNum}`;

  // Actualizar perfil del graduando en public.perfiles
  const { error } = await supabase
    .from('perfiles')
    .update({
      nombre,
      cedula_tipo: tipo,
      cedula_numero: formattedNum,
      cedula: cedulaCanonica,
      carrera,
      semestre,
      is_cedula_locked: true,
      is_profile_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    if (error.code === '23505') {
      return { error: 'Esta Cédula de Identidad ya está vinculada a otra cuenta académica.' };
    }
    return { error: error.message || 'Error al persistir los datos legales del graduando.' };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

