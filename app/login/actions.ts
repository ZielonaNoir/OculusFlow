'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error('Supabase Login Error:', error.message)
    let errorMessage = '身份验证失败'
    if (error.message === 'Invalid login credentials') {
      errorMessage = '邮箱或密码错误'
    } else if (error.message.includes('rate limit')) {
      errorMessage = '登录请求过多，请稍后再试'
    } else {
      errorMessage = error.message
    }
    redirect(`/login?message=${encodeURIComponent(errorMessage)}&type=error`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    console.error('Supabase Signup Error:', error.message)
    let errorMessage = '注册失败'
    if (error.message.includes('rate limit')) {
      errorMessage = '发送频率过快，请稍后再试'
    } else if (error.message.includes('already registered')) {
      errorMessage = '该邮箱已注册，请尝试登录'
    } else {
      errorMessage = error.message
    }
    redirect(`/login?message=${encodeURIComponent(errorMessage)}&type=error`)
  }

  revalidatePath('/', 'layout')
  redirect('/login?message=验证邮件已发送，请检查您的收件箱以完成注册&type=success')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
