import UIKit

final class ScannerViewController: UIViewController {
    private let modes = UISegmentedControl(items: ["Full screen", "System bars"])
    private let statusSwitch = UISwitch()
    private let report = UITextView()
    private let notice = UILabel()
    private let captureButton = UIButton(type: .system)
    private let guides = GeometryGuidesView()
    private let titleLabel = UILabel()
    private let legend = UILabel()
    private var contentStack: UIStackView?
    private var topInset: NSLayoutConstraint?
    private var bottomInset: NSLayoutConstraint?
    private var pendingCapture: DispatchWorkItem?
    private var hidesStatus = false
    private var latest: GeometryCapture?
    private var isTransitioning = false

    override var prefersStatusBarHidden: Bool { hidesStatus }
    override var prefersHomeIndicatorAutoHidden: Bool { false }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .all }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Geometry Scanner"
        view.backgroundColor = .systemBackground
        guides.isUserInteractionEnabled = false
        guides.isOpaque = false
        guides.backgroundColor = .clear
        guides.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(guides)
        NSLayoutConstraint.activate([
            guides.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            guides.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            guides.topAnchor.constraint(equalTo: view.topAnchor),
            guides.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        titleLabel.text = "Measure this view."
        titleLabel.font = .preferredFont(forTextStyle: .title1)
        titleLabel.adjustsFontForContentSizeCategory = true
        titleLabel.numberOfLines = 0
        legend.text = "Blue · bounds   Green · safe area   Orange · readable"
        legend.font = .preferredFont(forTextStyle: .caption1)
        legend.adjustsFontForContentSizeCategory = true
        legend.numberOfLines = 0
        legend.textColor = .secondaryLabel

        modes.selectedSegmentIndex = ProcessInfo.processInfo.arguments.contains("--system-bars") ? 1 : 0
        modes.accessibilityIdentifier = "scanner.mode"
        modes.addTarget(self, action: #selector(configurationChanged), for: .valueChanged)
        statusSwitch.accessibilityLabel = "Hide status bar"
        statusSwitch.accessibilityIdentifier = "scanner.hideStatus"
        statusSwitch.addTarget(self, action: #selector(configurationChanged), for: .valueChanged)
        let statusLabel = UILabel()
        statusLabel.text = "Hide status bar"
        statusLabel.font = .preferredFont(forTextStyle: .body)
        statusLabel.adjustsFontForContentSizeCategory = true
        let statusRow = UIStackView(arrangedSubviews: [statusLabel, statusSwitch])
        statusRow.alignment = .center

        report.isEditable = false
        report.isScrollEnabled = true
        report.font = .monospacedSystemFont(ofSize: 13, weight: .regular)
        report.backgroundColor = UIColor.secondarySystemBackground.withAlphaComponent(0.92)
        report.layer.cornerRadius = 16
        report.textContainerInset = UIEdgeInsets(top: 16, left: 12, bottom: 16, right: 12)
        report.accessibilityIdentifier = "scanner.report"
        report.heightAnchor.constraint(greaterThanOrEqualToConstant: 60).isActive = true

        var buttonConfiguration = UIButton.Configuration.filled()
        buttonConfiguration.title = "Export JSON + screenshot"
        buttonConfiguration.image = UIImage(systemName: "square.and.arrow.up")
        buttonConfiguration.imagePadding = 8
        captureButton.configuration = buttonConfiguration
        captureButton.accessibilityIdentifier = "scanner.export"
        captureButton.addTarget(self, action: #selector(exportCapture), for: .touchUpInside)
        notice.text = "Rotate or resize, then export a measured profile."
        notice.font = .preferredFont(forTextStyle: .caption1)
        notice.numberOfLines = 0
        notice.textColor = .secondaryLabel
        notice.accessibilityIdentifier = "scanner.notice"

        let stack = UIStackView(arrangedSubviews: [titleLabel, legend, modes, statusRow, report, captureButton, notice])
        contentStack = stack
        stack.axis = .vertical
        stack.spacing = 10
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        let safe = view.safeAreaLayoutGuide
        topInset = stack.topAnchor.constraint(equalTo: safe.topAnchor, constant: 20)
        bottomInset = stack.bottomAnchor.constraint(equalTo: safe.bottomAnchor, constant: -20)
        NSLayoutConstraint.activate([
            topInset!, bottomInset!,
            stack.centerXAnchor.constraint(equalTo: safe.centerXAnchor),
            stack.widthAnchor.constraint(lessThanOrEqualToConstant: 560),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: safe.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: safe.trailingAnchor, constant: -24)
        ])
        let preferredWidth = stack.widthAnchor.constraint(equalTo: safe.widthAnchor, constant: -48)
        preferredWidth.priority = .defaultHigh
        preferredWidth.isActive = true
        toolbarItems = [
            UIBarButtonItem(title: "Measured root view", style: .plain, target: nil, action: nil),
            UIBarButtonItem(systemItem: .flexibleSpace),
            UIBarButtonItem(title: "Export", style: .plain, target: self, action: #selector(exportCapture))
        ]
        registerForTraitChanges([UITraitHorizontalSizeClass.self, UITraitVerticalSizeClass.self,
                                 UITraitPreferredContentSizeCategory.self, UITraitUserInterfaceStyle.self]) {
            (controller: ScannerViewController, _: UITraitCollection) in
            controller.scheduleCapture()
        }
        configurationChanged()
    }

    @objc private func configurationChanged() {
        hidesStatus = statusSwitch.isOn
        setNeedsStatusBarAppearanceUpdate()
        let bars = modes.selectedSegmentIndex == 1
        navigationController?.setNavigationBarHidden(!bars, animated: false)
        navigationController?.setToolbarHidden(!bars, animated: false)
        view.setNeedsLayout()
        scheduleCapture()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        scheduleCapture()
    }
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let compact = view.safeAreaLayoutGuide.layoutFrame.height < 400
        if titleLabel.isHidden != compact {
            titleLabel.isHidden = compact
            legend.isHidden = compact
            contentStack?.spacing = compact ? 6 : 10
            topInset?.constant = compact ? 12 : 20
            bottomInset?.constant = compact ? -12 : -20
        }
        guides.safeFrame = view.safeAreaLayoutGuide.layoutFrame
        guides.readableFrame = view.readableContentGuide.layoutFrame
        scheduleCapture()
    }
    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        scheduleCapture()
    }
    override func viewWillTransition(to size: CGSize, with coordinator: any UIViewControllerTransitionCoordinator) {
        isTransitioning = true
        pendingCapture?.cancel()
        super.viewWillTransition(to: size, with: coordinator)
        coordinator.animate(alongsideTransition: nil) { [weak self] _ in
            self?.isTransitioning = false
            self?.scheduleCapture()
        }
    }

    private func scheduleCapture() {
        pendingCapture?.cancel()
        let task = DispatchWorkItem { [weak self] in self?.refreshCapture() }
        pendingCapture = task
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3, execute: task)
    }

    private func currentCapture() -> GeometryCapture? {
        guard !isTransitioning, presentedViewController == nil,
              let scene = view.window?.windowScene, scene.activationState == .foregroundActive else { return nil }
        let orientation: String
        switch scene.effectiveGeometry.interfaceOrientation {
        case .portrait: orientation = "portrait"
        case .portraitUpsideDown: orientation = "portraitUpsideDown"
        case .landscapeLeft: orientation = "landscapeLeft"
        case .landscapeRight: orientation = "landscapeRight"
        default: return nil
        }
        return GeometryCapture.measure(view: view, configuration: .init(
            mode: modes.selectedSegmentIndex == 0 ? "fullscreen" : "system-bars",
            target: "scanner.rootView", orientation: orientation,
            statusBarHidden: scene.statusBarManager?.isStatusBarHidden ?? hidesStatus,
            homeIndicatorAutoHidden: prefersHomeIndicatorAutoHidden,
            navigationBarVisible: navigationController?.isNavigationBarHidden == false,
            toolbarVisible: navigationController?.isToolbarHidden == false, tabBarVisible: false))
    }

    private func refreshCapture() {
        guard let capture = currentCapture() else { return }
        latest = capture
        guides.regions = capture.regionsIncludingInactive
        let inset = capture.safeAreaInsets
        let text = """
        \(capture.source.kind.uppercased()) · \(capture.source.model)
        iOS \(capture.source.osVersion) · \(capture.configuration.orientation)

        VIEW    \(capture.viewBounds.width) × \(capture.viewBounds.height) pt
        WINDOW  \(capture.windowBounds.width) × \(capture.windowBounds.height) pt
        SCALE   \(capture.scale)× · native \(capture.nativeScale)×

        SAFE AREA (pt)
        top     \(inset.top)
        right   \(inset.right)
        bottom  \(inset.bottom)
        left    \(inset.left)

        SIZE CLASSES
        \(capture.traits.horizontalSizeClass) / \(capture.traits.verticalSizeClass)

        RESERVED REGIONS
        \(capture.regionsSupported ? String(capture.regionsIncludingInactive.count) + " reported (including inactive)" : "Unavailable on this OS")

        Target: \(capture.configuration.target)
        Configuration: \(capture.configuration.mode)
        Coordinates: view-local · points
        """
        if report.text != text { report.text = text }
        do {
            try capture.encoded().write(to: documents.appendingPathComponent("latest.json"), options: .atomic)
        } catch {
            notice.text = "Could not save measurement: \(error.localizedDescription)"
        }
    }

    private var documents: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }

    @objc private func exportCapture() {
        view.layoutIfNeeded()
        guard let capture = currentCapture() else {
            notice.text = "Wait for the view to settle, then export again."
            return
        }
        do {
            let name = "geometry-\(capture.id)"
            let json = documents.appendingPathComponent(name + ".json")
            let png = documents.appendingPathComponent(name + ".png")
            try capture.encoded().write(to: json, options: .atomic)
            let renderer = UIGraphicsImageRenderer(bounds: view.bounds)
            let image = renderer.image { _ in view.drawHierarchy(in: view.bounds, afterScreenUpdates: true) }
            if let data = image.pngData() { try data.write(to: png, options: .atomic) }
            notice.text = "Saved \(name).json"
            let items: [Any] = FileManager.default.fileExists(atPath: png.path) ? [json, png] : [json]
            let share = UIActivityViewController(activityItems: items, applicationActivities: nil)
            share.popoverPresentationController?.sourceView = captureButton
            share.popoverPresentationController?.sourceRect = captureButton.bounds
            present(share, animated: true)
        } catch {
            notice.text = "Export failed: \(error.localizedDescription)"
        }
    }
}

final class GeometryGuidesView: UIView {
    var safeFrame = CGRect.zero { didSet { setNeedsDisplay() } }
    var readableFrame = CGRect.zero { didSet { setNeedsDisplay() } }
    var regions: [GeometryCapture.Region] = [] { didSet { setNeedsDisplay() } }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }
        context.setLineWidth(2)
        for (frame, color) in [(bounds.insetBy(dx: 2, dy: 2), UIColor.systemBlue),
                               (safeFrame.insetBy(dx: 4, dy: 4), .systemGreen),
                               (readableFrame.insetBy(dx: 7, dy: 7), .systemOrange)] {
            context.setStrokeColor(color.cgColor)
            context.stroke(frame)
        }
        for region in regions {
            let f = region.frame
            let frame = CGRect(x: f.x, y: f.y, width: f.width, height: f.height)
            context.setFillColor(UIColor.systemPurple.withAlphaComponent(region.active ? 0.2 : 0.04).cgColor)
            context.fill(frame)
            context.setStrokeColor(UIColor.systemPurple.cgColor)
            context.setLineDash(phase: 0, lengths: region.active ? [] : [4, 4])
            context.stroke(frame)
        }
    }
}
