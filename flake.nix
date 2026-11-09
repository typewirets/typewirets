{
  description = "typewirets development environment";

  inputs = {
    nixpkgs.url = "github:cachix/devenv-nixpkgs/rolling";
    systems.url = "github:nix-systems/default";
    devenv.url = "github:cachix/devenv";
    devenv.inputs.nixpkgs.follows = "nixpkgs";
  };

  nixConfig = {
    extra-trusted-public-keys = "devenv.cachix.org-1:w1cLUi8dv3hnoSPGAuibQv+f9TZLr6cv/Hm9XgU50cw=";
    extra-substituters = "https://devenv.cachix.org";
  };

  outputs = { self, nixpkgs, devenv, systems, ... } @ inputs:
    let
      forEachSystem = nixpkgs.lib.genAttrs (import systems);
    in
    {
      devShells = forEachSystem
        (system:
          let
            pkgs = nixpkgs.legacyPackages.${system};
          in
          {
            default = devenv.lib.mkShell {
              inherit inputs pkgs;
              modules = [
                {
                  # Node.js 26, the active LTS line. The packages support
                  # every LTS line from engines.node (>=22); CI tests each.
                  # No Corepack: pnpm 12 reads packageManager in package.json
                  # and switches to that version itself, after checking it
                  # against npm's signature and the hashes in pnpm-lock.yaml.
                  languages.javascript = {
                    enable = true;
                    package = pkgs.nodejs_26;
                    pnpm.enable = true;
                  };

                  packages = with pkgs; [
                    gh
                    just
                    git
                  ];

                  enterShell = ''
                    echo "typewirets dev shell loaded"
                    echo "Node.js: $(node --version)"
                    echo "pnpm: $(pnpm --version)"
                  '';
                }
              ];
            };
          });
    };
}
