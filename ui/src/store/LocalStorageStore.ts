import { writable } from 'svelte/store'

export default function LocalStorageStore<T>(key: string, initial: T) {
  const storedValue = localStorage.getItem(key)
  const data = storedValue ? JSON.parse(storedValue) : typeof initial === 'undefined' ? null : initial

  const store = writable<T>(data)

  store.subscribe(value => {
    localStorage.setItem(key, JSON.stringify(value))
  })

  return store
}