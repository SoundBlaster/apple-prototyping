import UIKit
import Darwin

struct CaptureRect: Codable {
    let x: Double
    let y: Double
    let width: Double
    let height: Double
    init(_ rect: CGRect) {
        x = rect.origin.x; y = rect.origin.y
        width = rect.width; height = rect.height
    }
}

struct CaptureInsets: Codable {
    let top: Double
    let right: Double
    let bottom: Double
    let left: Double
    init(_ insets: UIEdgeInsets) {
        top = insets.top; right = insets.right
        bottom = insets.bottom; left = insets.left
    }
}

struct GeometryCapture: Codable {
    struct Source: Codable {
        let kind: String
        let model: String
        let osVersion: String
        let osBuild: String
        let scannerVersion: String
    }
    struct Configuration: Codable {
        let mode: String
        let target: String
        let orientation: String
        let statusBarHidden: Bool
        let homeIndicatorAutoHidden: Bool
        let navigationBarVisible: Bool
        let toolbarVisible: Bool
        let tabBarVisible: Bool
    }
    struct Traits: Codable {
        let horizontalSizeClass: String
        let verticalSizeClass: String
        let contentSizeCategory: String
        let userInterfaceStyle: String
        let layoutDirection: String
    }
    struct Region: Codable {
        let kind: String
        let active: Bool
        let frame: CaptureRect
        let margins: CaptureInsets
    }
    let schemaVersion: Int
    let id: String
    let capturedAt: String
    let source: Source
    let configuration: Configuration
    let units: String
    let coordinateSpace: String
    let viewBounds: CaptureRect
    let windowBounds: CaptureRect
    let viewFrameInWindow: CaptureRect
    let screenBounds: CaptureRect
    let nativeBounds: CaptureRect
    let scale: Double
    let nativeScale: Double
    let safeAreaInsets: CaptureInsets
    let safeAreaFrame: CaptureRect
    let layoutMargins: CaptureInsets
    let readableContentFrame: CaptureRect
    let traits: Traits
    let regionsSupported: Bool
    let regionsIncludingInactive: [Region]

    /// Captures the owning view, never a global key window. Call after visible layout settles.
    @MainActor static func measure(view: UIView, configuration: Configuration) -> GeometryCapture? {
        guard let window = view.window, !window.isHidden,
              view.bounds.width > 0, view.bounds.height > 0 else { return nil }
        let screen = window.screen
        let traits = view.traitCollection
        var regions: [Region] = []
        var regionsSupported = false
        if #available(iOS 27.1, *) {
            regionsSupported = true
            for (kind, name) in [(UIView.ReservedRegion.Kind.occlusion, "occlusion"), (.division, "division")] {
                regions += view.reservedRegions(kind: kind, options: .includeInactive).map {
                    Region(kind: name, active: $0.isActive, frame: CaptureRect($0.frame),
                           margins: CaptureInsets($0.margins))
                }
            }
        }
        #if targetEnvironment(simulator)
        let kind = "simulator"
        let model = ProcessInfo.processInfo.environment["SIMULATOR_MODEL_IDENTIFIER"] ?? machineIdentifier()
        #else
        let kind = "device"
        let model = machineIdentifier()
        #endif
        let version = ProcessInfo.processInfo.operatingSystemVersion
        let source = Source(kind: kind, model: model,
                            osVersion: "\(version.majorVersion).\(version.minorVersion).\(version.patchVersion)",
                            osBuild: operatingSystemBuild(),
                            scannerVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown")
        return GeometryCapture(
            schemaVersion: 1, id: UUID().uuidString,
            capturedAt: ISO8601DateFormatter().string(from: Date()),
            source: source, configuration: configuration, units: "pt", coordinateSpace: "view-local",
            viewBounds: CaptureRect(view.bounds), windowBounds: CaptureRect(window.bounds),
            viewFrameInWindow: CaptureRect(view.convert(view.bounds, to: window)),
            screenBounds: CaptureRect(screen.bounds), nativeBounds: CaptureRect(screen.nativeBounds),
            scale: traits.displayScale, nativeScale: screen.nativeScale,
            safeAreaInsets: CaptureInsets(view.safeAreaInsets),
            safeAreaFrame: CaptureRect(view.safeAreaLayoutGuide.layoutFrame),
            layoutMargins: CaptureInsets(view.layoutMargins),
            readableContentFrame: CaptureRect(view.readableContentGuide.layoutFrame),
            traits: Traits(horizontalSizeClass: sizeClass(traits.horizontalSizeClass),
                           verticalSizeClass: sizeClass(traits.verticalSizeClass),
                           contentSizeCategory: traits.preferredContentSizeCategory.rawValue,
                           userInterfaceStyle: traits.userInterfaceStyle == .dark ? "dark" : "light",
                           layoutDirection: traits.layoutDirection == .rightToLeft ? "rtl" : "ltr"),
            regionsSupported: regionsSupported, regionsIncludingInactive: regions)
    }

    func encoded() throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        return try encoder.encode(self)
    }

    private static func sizeClass(_ value: UIUserInterfaceSizeClass) -> String {
        switch value { case .compact: "compact"; case .regular: "regular"; default: "unspecified" }
    }
    private static func machineIdentifier() -> String { systemValue("hw.machine") }
    private static func operatingSystemBuild() -> String {
        // sysctl kern.osversion reports the host kernel under Simulator.
        let description = ProcessInfo.processInfo.operatingSystemVersionString
        guard let start = description.range(of: "(Build "),
              let end = description[start.upperBound...].firstIndex(of: ")") else { return "unknown" }
        return String(description[start.upperBound..<end])
    }
    private static func systemValue(_ name: String) -> String {
        var size = 0
        guard sysctlbyname(name, nil, &size, nil, 0) == 0, size > 0 else { return "unknown" }
        var bytes = [CChar](repeating: 0, count: size)
        guard sysctlbyname(name, &bytes, &size, nil, 0) == 0 else { return "unknown" }
        return bytes.withUnsafeBufferPointer { String(cString: $0.baseAddress!) }
    }
}
