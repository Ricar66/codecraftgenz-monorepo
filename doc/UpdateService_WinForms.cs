// =============================================================
// UpdateService — Windows Forms (.NET 6/7/8/9 OU .NET Framework 4.x)
// =============================================================
// COMO USAR:
//   1. Copie este arquivo para a pasta do seu projeto WinForms
//   2. Troque o namespace abaixo pelo namespace do seu projeto
//   3. No Program.cs (antes de Application.Run), adicione:
//
//      // .NET 6+:
//      Task.Run(async () => {
//          await Task.Delay(3000);
//          await new UpdateService("SEU-SLUG-AQUI").CheckForUpdatesAsync();
//      });
//      Application.Run(new Form1());
//
//      // .NET Framework 4.x (sem async no Main):
//      Task.Run(() => new UpdateService("SEU-SLUG-AQUI").CheckForUpdatesAsync());
//      Application.Run(new Form1());
//
//   OU no Form1_Load do formulário principal:
//      _ = new UpdateService("SEU-SLUG-AQUI").CheckForUpdatesAsync();
//
//   4. No .csproj, garanta que existe:
//      <AssemblyVersion>1.0.0.0</AssemblyVersion>
//
// PARA .NET FRAMEWORK 4.x: instale Newtonsoft.Json via NuGet e
//   use a versão alternativa do parse no final deste arquivo.
// =============================================================

using System;
using System.Diagnostics;
using System.Net.Http;
using System.Reflection;
using System.Text.Json;          // .NET 6+ nativo. Para .NET 4.x, veja nota abaixo.
using System.Threading.Tasks;
using System.Windows.Forms;

namespace SEU_NAMESPACE           // <-- troque aqui
{
    public class UpdateService
    {
        // HttpClient estático — seguro para múltiplas chamadas
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
                var response = await _http.GetAsync(BaseUrl + _slug);
                if (!response.IsSuccessStatusCode) return;

                var json = await response.Content.ReadAsStringAsync();

                // --- Parse com System.Text.Json (.NET 6+) ---
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (!root.TryGetProperty("version", out var versionEl)) return;
                var remoteVersionStr = versionEl.GetString();
                if (string.IsNullOrEmpty(remoteVersionStr)) return;

                Version remoteVersion;
                if (!Version.TryParse(remoteVersionStr, out remoteVersion)) return;

                var currentVersion = Assembly.GetExecutingAssembly().GetName().Version;
                if (currentVersion == null || remoteVersion <= currentVersion) return;

                string downloadUrl = null;
                JsonElement platforms, winPlatform, urlEl;
                if (root.TryGetProperty("platforms", out platforms) &&
                    platforms.TryGetProperty("windows-x86_64", out winPlatform) &&
                    winPlatform.TryGetProperty("url", out urlEl))
                {
                    downloadUrl = urlEl.GetString();
                }

                if (string.IsNullOrEmpty(downloadUrl)) return;

                string notes = "";
                JsonElement notesEl;
                if (root.TryGetProperty("notes", out notesEl))
                    notes = notesEl.GetString() ?? "";

                // WinForms: MessageBoxButtons (não MessageBoxButton como no WPF)
                var result = MessageBox.Show(
                    string.Format("Nova versão {0} disponível!\n\n{1}\n\nDeseja baixar e instalar agora?",
                        remoteVersionStr, notes),
                    "Atualização disponível",
                    MessageBoxButtons.YesNo,        // <-- diferente do WPF
                    MessageBoxIcon.Information
                );

                if (result == DialogResult.Yes)     // <-- diferente do WPF
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

// =============================================================
// VERSÃO .NET FRAMEWORK 4.x com Newtonsoft.Json
// Substitua o bloco "Parse com System.Text.Json" por:
// =============================================================
//
// using Newtonsoft.Json.Linq;  // adicione no topo do arquivo
//
// var obj = JObject.Parse(json);
// var remoteVersionStr = obj["version"] != null ? obj["version"].ToString() : null;
// if (string.IsNullOrEmpty(remoteVersionStr)) return;
//
// Version remoteVersion;
// if (!Version.TryParse(remoteVersionStr, out remoteVersion)) return;
//
// var currentVersion = Assembly.GetExecutingAssembly().GetName().Version;
// if (currentVersion == null || remoteVersion <= currentVersion) return;
//
// string downloadUrl = null;
// if (obj["platforms"] != null && obj["platforms"]["windows-x86_64"] != null)
//     downloadUrl = obj["platforms"]["windows-x86_64"]["url"] != null
//         ? obj["platforms"]["windows-x86_64"]["url"].ToString() : null;
//
// if (string.IsNullOrEmpty(downloadUrl)) return;
// string notes = obj["notes"] != null ? obj["notes"].ToString() : "";
