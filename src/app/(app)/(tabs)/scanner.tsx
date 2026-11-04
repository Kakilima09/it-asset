import Ionicons from '@expo/vector-icons/Ionicons'
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/ui/app-text'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Screen } from '@/components/ui/screen'
import { ApiError, api } from '@/lib/api-client'
import { colors, radius, spacing } from '@/lib/theme'

const BARCODE_TYPES = [
  'qr',
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'code93',
  'pdf417',
  'datamatrix',
  'aztec',
  'itf14',
  'codabar',
] as const

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [focused, setFocused] = useState(true)
  const [torch, setTorch] = useState(false)
  const [manual, setManual] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lock = useRef(false)

  useFocusEffect(
    useCallback(() => {
      setFocused(true)
      lock.current = false
      setError(null)
      return () => {
        setFocused(false)
        setTorch(false)
      }
    }, [])
  )

  const lookup = useCallback(async (identifier: string) => {
    const value = identifier.trim()
    if (!value || busy) return
    setBusy(true)
    setError(null)
    try {
      const { asset } = await api.assetLookup(value)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.push({ pathname: '/assets/[id]', params: { id: asset.id } })
    } catch (cause) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setError(cause instanceof ApiError ? cause.message : 'Aset tidak dapat dicari. Periksa koneksi.')
      setTimeout(() => {
        lock.current = false
      }, 1500)
    } finally {
      setBusy(false)
    }
  }, [busy])

  const handleBarcode = useCallback(
    (result: BarcodeScanningResult) => {
      if (lock.current) return
      lock.current = true
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      void lookup(result.data)
    },
    [lookup]
  )

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">Pindai</AppText>
        <AppText variant="caption">Arahkan kamera ke barcode atau QR aset.</AppText>
      </View>

      {!permission ? (
        <View style={styles.permissionCard}>
          <ActivityIndicator color={colors.primary} />
          <AppText variant="caption">Memeriksa izin kamera…</AppText>
        </View>
      ) : !permission.granted ? (
        <Card style={styles.permissionCard}>
          <Ionicons name="camera-outline" size={32} color={colors.primary} />
          <AppText variant="subtitle">Izin kamera diperlukan</AppText>
          <AppText variant="caption" style={styles.centerText}>
            Aktifkan izin kamera untuk memindai barcode aset. Anda tetap dapat memasukkan kode secara manual.
          </AppText>
          <Button
            title={permission.canAskAgain ? 'Izinkan kamera' : 'Buka pengaturan'}
            onPress={() => void requestPermission()}
          />
        </Card>
      ) : (
        <View style={styles.cameraFrame}>
          {focused ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
              onBarcodeScanned={busy ? undefined : handleBarcode}
            />
          ) : null}
          <View pointerEvents="none" style={styles.overlay}>
            <View style={styles.scanBox} />
            <AppText style={styles.overlayHint}>Posisikan kode di dalam kotak</AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={torch ? 'Matikan senter' : 'Nyalakan senter'}
            onPress={() => setTorch((value) => !value)}
            style={({ pressed }) => [styles.torchButton, pressed ? styles.pressed : null]}>
            <Ionicons name={torch ? 'flash' : 'flash-off'} size={20} color="#ffffff" />
          </Pressable>
          {busy ? (
            <View style={styles.busyOverlay}>
              <ActivityIndicator color="#ffffff" />
              <AppText style={styles.busyText}>Mencari aset…</AppText>
            </View>
          ) : null}
        </View>
      )}

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <AppText style={styles.errorText}>{error}</AppText>
        </View>
      ) : null}

      <Card style={styles.manualCard}>
        <AppText variant="subtitle">Input manual</AppText>
        <AppText variant="caption">Gunakan tag aset, barcode, atau nomor serial.</AppText>
        <Input
          value={manual}
          onChangeText={setManual}
          placeholder="Contoh: AST-2026-001"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => void lookup(manual)}
        />
        <Button
          title="Cari aset"
          loading={busy}
          disabled={!manual.trim()}
          onPress={() => void lookup(manual)}
          icon={<Ionicons name="search-outline" size={18} color="#ffffff" />}
        />
      </Card>

      <Card style={styles.tipsCard}>
        <AppText variant="subtitle">Tips memindai</AppText>
        {['Pastikan pencahayaan cukup.', 'Bersihkan label barcode dari debu.', 'Tahan perangkat stabil hingga kode terbaca.'].map((tip) => (
          <View key={tip} style={styles.tipRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
            <AppText variant="caption" style={styles.tipText}>{tip}</AppText>
          </View>
        ))}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  cameraFrame: {
    height: 340,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  scanBox: {
    width: '72%',
    aspectRatio: 1.35,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  overlayHint: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  torchButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(15,23,42,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  busyOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  busyText: { color: '#ffffff', fontWeight: '600' },
  permissionCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  centerText: { textAlign: 'center', maxWidth: 300 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 13 },
  manualCard: { gap: spacing.sm },
  tipsCard: { gap: spacing.sm },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tipText: { flex: 1 },
})
