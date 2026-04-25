import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: () => import('../views/LoginView.vue'),
    meta: { redirectIfAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/contacts',
    name: 'Contacts',
    component: () => import('../views/ContactsListView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/contacts/new',
    name: 'NewContact',
    component: () => import('../views/NewContactView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/contacts/:id',
    name: 'Contact',
    component: () => import('../views/ContactView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/contacts/:id/prep',
    name: 'MeetingPrep',
    component: () => import('../views/MeetingPrepView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/intros',
    name: 'Intros',
    component: () => import('../views/IntrosView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/import',
    name: 'Import',
    component: () => import('../views/ImportView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/import/onboarding',
    name: 'Onboarding',
    component: () => import('../views/OnboardingView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { requiresAuth: true }
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading.value) {
    const interval = setInterval(() => {
      if (!loading.value) {
        clearInterval(interval)
        doNavigationGuard(to, isAuthenticated, next)
      }
    }, 10)
    return
  }

  doNavigationGuard(to, isAuthenticated, next)
})

function doNavigationGuard(to, isAuthenticated, next) {
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next({ name: 'Landing' })
  } else if (to.meta.requiresGuest && isAuthenticated.value) {
    next({ name: 'Dashboard' })
  } else if (to.meta.redirectIfAuth && isAuthenticated.value) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
}

export default router
