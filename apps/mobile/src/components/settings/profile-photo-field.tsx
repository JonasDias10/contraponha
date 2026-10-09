import { AVATAR_SIZE_PX } from "@contraponha/config"
import { useProfilePhoto } from "@contraponha/client-core/react"
import type { PrivateProfile } from "@contraponha/types"
import { ImageManipulator, SaveFormat } from "expo-image-manipulator"
import * as ImagePicker from "expo-image-picker"
import { StyleSheet, View } from "react-native"

import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { AppText } from "@/components/ui/text"
import { useI18n } from "@/providers/i18n-provider"
import { useToast } from "@/providers/toast-provider"
import { space } from "@/lib/theme"

const JPEG_QUALITY = 0.88

interface ProfilePhotoFieldProps {
  viewer: PrivateProfile
}

// The picker crops to a square; the manipulator scales it down so uploads stay small.
async function squareJpeg(asset: ImagePicker.ImagePickerAsset): Promise<Blob> {
  const context = ImageManipulator.manipulate(asset.uri)

  if (Math.min(asset.width, asset.height) > AVATAR_SIZE_PX)
    context.resize({ width: AVATAR_SIZE_PX, height: AVATAR_SIZE_PX })

  const image = await context.renderAsync()
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY })
  const file = await fetch(result.uri)

  return file.blob()
}

export function ProfilePhotoField({ viewer }: ProfilePhotoFieldProps): React.JSX.Element {
  const { t } = useI18n()
  const toast = useToast()
  const photo = useProfilePhoto()
  const isBusy = photo.isUploading || photo.isRemoving

  const handlePick = async (): Promise<void> => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    })

    const asset = picked.assets?.[0]

    if (picked.canceled || !asset) return

    try {
      const body = await squareJpeg(asset)

      photo.upload({ body, mimeType: "image/jpeg" })
    } catch {
      toast.error(t("web.settings.photoFailed"))
    }
  }

  return (
    <View style={styles.row}>
      <Avatar id={viewer.id} name={viewer.displayName} src={viewer.avatarUrl} size="xl" />
      <View style={styles.details}>
        <AppText variant="smallStrong">{t("web.settings.photo")}</AppText>
        <AppText variant="caption" tone="muted">
          {t("web.settings.photoHint")}
        </AppText>
        <View style={styles.actions}>
          <Button
            size="sm"
            variant="secondary"
            label={viewer.avatarUrl ? t("web.settings.photoChange") : t("web.settings.photoChoose")}
            isLoading={photo.isUploading}
            disabled={isBusy}
            onPress={() => void handlePick()}
          />
          {viewer.avatarUrl ? (
            <Button
              size="sm"
              variant="ghost"
              label={t("web.settings.photoRemove")}
              isLoading={photo.isRemoving}
              disabled={isBusy}
              onPress={photo.remove}
            />
          ) : null}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.lg },
  details: { flex: 1, gap: space.xs },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.xs },
})
