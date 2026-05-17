// =============================================================
// UpdateService — WPF (.NET 6 / 7 / 8 / 9)
// =============================================================
// COMO USAR:
//   1. Copie este arquivo para a pasta Services do seu projeto WPF
//   2. Troque o namespace abaixo pelo namespace do seu projeto
//   3. No App.xaml.cs, dentro de OnStartup(), adicione:
//
//      _ = Task.Run(async () => {
//          await Task.Delay(3000);
//          await new UpdateService("SEU-SLUG-AQUI").CheckForUpdatesAsync();
//      });
//
//   4. No .csproj, garanta que existe:
//      <AssemblyVersion>1.0.0.0</AssemblyVersion>
//
// SLUGS disponíveis: reflexcraft, coincraft2, deskcraft, snippetcraft,
//   vaultcraft, coincraft, presencecraft, quizcraft, studycraft
// Para um app novo: registre no admin (POST /api/apps/:id/release com slug)
// =============================================================

using System;
using System.Diagnostics;
using System.Net.Http;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;

namespace SEU_NAMESPACE.Services   // <-- troque aqui
{
    public class UpdateService
    {
        private static readonly HttpClient _http = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(10)
        };

        private readonly string _slug;
        private const string BaseUrl = "https://api.codecraftgenz.com.br/api/updates/";

        public UpdateService(string slug)
        {
            _slug = slug;
        }

        public async Task CheckForUpdatesAsync()
        {
            try
            {
                var response = await _http.GetAsync($"{BaseUrl}{_slug}");
                if (!response.IsSuccessStatusCode) return;

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (!root.TryGetProperty("version", out var versionEl)) return;
                var remoteVersionStr = versionEl.GetString();
                if (string.IsNullOrEmpty(remoteVersionStr)) return;

                if (!Version.TryParse(remoteVersionStr, out var remoteVersion)) return;

                var currentVersion = Assembly.GetExecutingAssembly().GetName().Version;
                if (currentVersion == null || remoteVersion <= currentVersion) return;

                string? downloadUrl = null;
                if (root.TryGetProperty("platforms", out var platforms) &&
                    platforms.TryGetProperty("windows-x86_64", out var winPlatform) &&
                    winPlatform.TryGetProperty("url", out var urlEl))
                {
                    downloadUrl = urlEl.GetString();
                }

                if (string.IsNullOrEmpty(downloadUrl)) return;

                string notes = root.TryGetProperty("notes", out var notesEl)
                    ? notesEl.GetString() ?? ""
                    : "";

                var result = MessageBox.Show(
                    $"Nova versão {remoteVersionStr} disponível!\n\n{notes}\n\nDeseja baixar e instalar agora?",
                    "Atualização disponível",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Information
                );

                if (result == MessageBoxResult.Yes)
                {
                    if (!Uri.TryCreate(downloadUrl, UriKind.Absolute, out var uri) ||
                        uri.Scheme != Uri.UriSchemeHttps ||
                        !uri.Host.EndsWith("codecraftgenz.com.br", StringComparison.OrdinalIgnoreCase))
                        return;

                    Process.Start(new ProcessStartInfo
                    {
                        FileName = downloadUrl,
                        UseShellExecute = true
                    });
                }
            }
            catch
            {
                // Falha silenciosa — update check não pode travar o app
            }
        }
    }
}
