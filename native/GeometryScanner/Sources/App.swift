import UIKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     configurationForConnecting session: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: "Scanner", sessionRole: session.role)
        configuration.delegateClass = SceneDelegate.self
        return configuration
    }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: scene)
        window.rootViewController = ScannerNavigationController(rootViewController: ScannerViewController())
        self.window = window
        window.makeKeyAndVisible()
    }

    func windowScene(_ windowScene: UIWindowScene, didUpdateEffectiveGeometry previousGeometry: UIWindowScene.Geometry) {
        (window?.rootViewController as? UINavigationController)?.topViewController?.view.setNeedsLayout()
    }
}

final class ScannerNavigationController: UINavigationController {
    override var childForStatusBarHidden: UIViewController? { topViewController }
    override var childForHomeIndicatorAutoHidden: UIViewController? { topViewController }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .all }
}
