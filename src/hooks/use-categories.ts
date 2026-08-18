import { useState, useEffect, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import type { Category } from '@/types/finance'
import { mergeCategories, type CategoryMeta } from '@/lib/categories'

/**
 * Hook que carrega as categorias do banco (coleção `categories`) e mescla
 * com o fallback estático (CATEGORY_META). As categorias do banco prevalecem.
 *
 * Expõe `metas` (lista de CategoryMeta para selects/renders) e `raw`
 * (lista de Category bruta para o CRUD).
 */
export function useCategories() {
  const [raw, setRaw] = useState<Category[]>([])
  const [metas, setMetas] = useState<CategoryMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const list = await pb.collection('categories').getFullList<Category>({
        sort: 'name',
      })
      setRaw(list)
      setMetas(mergeCategories(list))
    } catch (err) {
      console.error('useCategories: falha ao carregar do banco, usando fallback', err)
      setRaw([])
      // fallback puro
      setMetas(mergeCategories([]))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { raw, metas, isLoading, reload: load }
}

export default useCategories
