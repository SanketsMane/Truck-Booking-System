# Compose theming

The token contract in `design-system.md` is unchanged. This file is how you express it in Compose without letting Material's defaults become your brand.

## 1. The problem with plain MaterialTheme

`MaterialTheme.colorScheme` gives you `primary`, `surface`, `onSurface`, `error` and so on. That is a **Material** vocabulary, not your product's. It has no `money.positive`, no `status.warning.surface`, no `text.tertiary`, no `border.subtle`.

Two failure modes follow from using it raw:

1. Components reach for the nearest Material slot (`error` for a debit amount, `tertiary` for a badge), and semantics drift.
2. Missing tokens get filled with literal `Color(0xFF...)` at the call site — the exact thing `design-system.md` forbids.

**Fix:** define your own token objects and expose them through `CompositionLocal`, alongside `MaterialTheme` (which you still want for ripples, text-selection handles and any Material component you use).

## 2. Token objects

```kotlin
@Immutable
data class AppColors(
    val brandPrimary: Color, val brandPrimaryPressed: Color, val brandPrimarySubtle: Color,
    val brandOnPrimary: Color,
    val bgCanvas: Color, val bgSubtle: Color,
    val surfaceDefault: Color, val surfaceRaised: Color, val surfaceSunken: Color,
    val textPrimary: Color, val textSecondary: Color, val textTertiary: Color, val textDisabled: Color,
    val borderSubtle: Color, val borderDefault: Color, val borderStrong: Color, val borderFocus: Color,
    val statusSuccess: StatusColors, val statusWarning: StatusColors,
    val statusError: StatusColors, val statusInfo: StatusColors,
    val moneyPositive: Color, val moneyNegative: Color, val moneyNeutral: Color, val moneyPending: Color,
    val overlayPressed: Color, val skeletonBase: Color, val skeletonHighlight: Color,
)

@Immutable
data class StatusColors(val base: Color, val surface: Color, val text: Color, val border: Color)
```

The same set as `design-system.md` §5. Light and dark are two instances of **one** type, so a token missing from dark is a compile error — the same guarantee the RN template gives.

`@Immutable` matters: without it Compose treats the class as unstable and every consumer recomposes on any theme read. See `compose-performance.md` §3.

Do the same for the rest of the contract:

```kotlin
// All twelve steps of the 4 pt scale from design-system.md §2 — do not drop the
// ends; 2.dp optical nudges and 64.dp hero gaps both have real uses.
@Immutable
data class AppSpacing(
    val none: Dp = 0.dp,  val xxs: Dp = 2.dp,  val xs: Dp = 4.dp,   val sm: Dp = 8.dp,
    val md: Dp = 12.dp,   val base: Dp = 16.dp, val lg: Dp = 20.dp, val xl: Dp = 24.dp,
    val xxl: Dp = 32.dp,  val xxxl: Dp = 40.dp, val huge: Dp = 48.dp, val giant: Dp = 64.dp,
)

@Immutable
data class AppRadius(
    val none: Dp = 0.dp, val xs: Dp = 4.dp,  val sm: Dp = 8.dp,   val md: Dp = 12.dp,
    val lg: Dp = 16.dp,  val xl: Dp = 20.dp, val xxl: Dp = 28.dp, val pill: Dp = 999.dp,
)

@Immutable
data class AppType(
    val display: TextStyle, val headline: TextStyle, val title: TextStyle,
    val subtitle: TextStyle, val body: TextStyle, val bodyStrong: TextStyle,
    val bodySmall: TextStyle, val label: TextStyle, val caption: TextStyle,
    val overline: TextStyle,
    // Money — every one of these carries fontFeatureSettings = "tnum". See §6.
    val amountXL: TextStyle, val amountL: TextStyle, val amountM: TextStyle,
    val amountS: TextStyle, val amountXS: TextStyle,
)

@Immutable
data class AppDuration(
    val instant: Int = 80, val fast: Int = 140, val base: Int = 220,
    val slow: Int = 320, val deliberate: Int = 480, val pulse: Int = 900,
)
```

Values come straight from `design-system.md` §2, §3, §4 and §7 — the same contract the React Native
templates implement. Do not re-derive them, and do not drop steps: a partial scale is how two
platforms of the same app drift apart.

## 3. Wiring it up

```kotlin
val LocalAppColors = staticCompositionLocalOf<AppColors> { error("AppTheme missing") }
val LocalAppSpacing = staticCompositionLocalOf { AppSpacing() }
val LocalAppRadius = staticCompositionLocalOf { AppRadius() }
val LocalAppType = staticCompositionLocalOf<AppType> { error("AppTheme missing") }

@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = if (darkTheme) DarkAppColors else LightAppColors
    CompositionLocalProvider(
        LocalAppColors provides colors,
        LocalAppSpacing provides AppSpacing(),
        LocalAppRadius provides AppRadius(),
        LocalAppType provides appTypography,
    ) {
        MaterialTheme(
            // Map the brand onto Material's slots so ripples, selection handles and
            // any Material component you do use inherit the right colours.
            colorScheme = if (darkTheme) darkColorScheme(primary = colors.brandPrimary, /* ... */)
                          else lightColorScheme(primary = colors.brandPrimary, /* ... */),
            content = content,
        )
    }
}

// Ergonomic accessors
object AppTheme {
    val colors: AppColors  @Composable @ReadOnlyComposable get() = LocalAppColors.current
    val spacing: AppSpacing @Composable @ReadOnlyComposable get() = LocalAppSpacing.current
    val radius: AppRadius  @Composable @ReadOnlyComposable get() = LocalAppRadius.current
    val type: AppType      @Composable @ReadOnlyComposable get() = LocalAppType.current
}
```

Usage:

```kotlin
Text(text = amount, style = AppTheme.type.amountM, color = AppTheme.colors.moneyPositive)
```

`staticCompositionLocalOf` (not `compositionLocalOf`) for values that change rarely — it skips change tracking, so reads are cheap. Use `compositionLocalOf` only if a value changes often.

`@ReadOnlyComposable` on the accessors avoids creating a recompose scope for a simple read.

## 4. Dynamic colour (Material You)

Off by default for brand-led and fintech products — see `android.md` §8. If you do adopt it:

```kotlin
val useDynamic = Build.VERSION.SDK_INT >= 31 && userPrefersDynamic
val scheme = when {
    useDynamic && darkTheme -> dynamicDarkColorScheme(context)
    useDynamic -> dynamicLightColorScheme(context)
    darkTheme -> darkColorScheme(...)
    else -> lightColorScheme(...)
}
```

Apply dynamic colour to **neutral surfaces only**. `brandPrimary`, all four status colours and all money colours stay fixed. Never let wallpaper decide what "error" or "pending" looks like.

## 5. Dark theme

Every rule in `dark-mode.md` applies. Compose specifics:

- `isSystemInDarkTheme()` is the default; an in-app override is a `DataStore` preference read before first composition.
- Elevation in dark = lighter `surfaceRaised`, **not** shadow. `Modifier.shadow()` is nearly invisible on a dark canvas — use a `Modifier.border(1.dp, colors.borderSubtle, shape)` instead.
- Set the night theme's `android:windowBackground` in `values-night/themes.xml` so cold start does not flash white. A Compose-only theme change does not affect the launch window.
- Status bar / navigation bar icon colour:

```kotlin
enableEdgeToEdge(
    statusBarStyle = SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT) { darkTheme },
)
```

## 6. Typography and font scaling

```kotlin
val appTypography = AppType(
    body = TextStyle(fontSize = 16.sp, lineHeight = 24.sp, fontWeight = FontWeight.Normal),
    amountM = TextStyle(fontSize = 20.sp, lineHeight = 26.sp, fontWeight = FontWeight.SemiBold,
                        fontFeatureSettings = "tnum"),   // tabular figures — mandatory on money
)
```

- **`sp` for text, `dp` for everything else.** `sp` scales with the user's font setting; `dp` does not. Using `dp` for text sizes disables font scaling and is an accessibility defect.
- `fontFeatureSettings = "tnum"` is the Compose equivalent of `fontVariant: ['tabular-nums']`. Money without it jitters.
- Always set `lineHeight` explicitly.
- To cap growth on a huge numeric display, clamp at the call site rather than switching to `dp`:
  `fontSize = (36 * min(fontScale, 1.3f) / fontScale).sp` — or better, let it grow and use `AutoSize`/`BasicText` with size steps.
- Test at font scale 2.0× — see `accessibility.md` §4.

## 7. Shapes and elevation

```kotlin
Modifier
    .clip(RoundedCornerShape(AppTheme.radius.lg))
    .background(AppTheme.colors.surfaceRaised)
    .border(1.dp, AppTheme.colors.borderSubtle, RoundedCornerShape(AppTheme.radius.lg))
```

- `Modifier.shadow(elevation, shape)` clips to the shape and must come **before** `background`.
- Prefer border-based separation over shadow, per `cards-and-surfaces.md`.
- Nested radius: `inner = outer - padding`, clamped to ≥ 4.dp.

## 8. Migrating an existing Material-themed app

Do not rewrite it wholesale — `project-integration.md` §7 applies.

1. Add the `AppColors`/`AppTheme` layer alongside the existing `MaterialTheme`.
2. Map the existing Material slots into your token names so both resolve to the same values.
3. Adopt tokens in new code; migrate old screens opportunistically.
4. Add a lint rule or a CI grep for literal `Color(0xFF` and `.dp` outside the theme package.

## 9. Checklist

- [ ] `AppColors` is one type; light and dark are two instances of it
- [ ] All token classes marked `@Immutable`
- [ ] `staticCompositionLocalOf` + `@ReadOnlyComposable` accessors
- [ ] `MaterialTheme` still wrapped, with brand mapped onto its slots
- [ ] No literal `Color(0xFF...)`, `.dp` or `.sp` outside the theme package
- [ ] `sp` for all text sizes; `tnum` on every money style
- [ ] Dark values exist for every token; `values-night/` window background set
- [ ] Dynamic colour either off, or restricted to neutral surfaces
