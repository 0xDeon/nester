package config

import "testing"

func TestDescribeRecordsLoaderReads(t *testing.T) {
	byName := map[string]VarSpec{}
	for _, v := range Describe() {
		if _, dup := byName[v.Name]; dup {
			t.Fatalf("Describe returned %s twice", v.Name)
		}
		byName[v.Name] = v
	}

	if v := byName["AUTH_JWT_SECRET"]; !v.Required || !v.Secret {
		t.Errorf("AUTH_JWT_SECRET should be required and secret, got %+v", v)
	}
	if v := byName["STELLAR_RPC_URL"]; !v.Required || v.Type != "url" {
		t.Errorf("STELLAR_RPC_URL should be a required url, got %+v", v)
	}
	if v := byName["SERVER_PORT"]; v.Default != "8080" || v.Type != "int" {
		t.Errorf("SERVER_PORT should default to int 8080, got %+v", v)
	}
	if _, ok := byName["ACCOUNT_CIPHER_KEYS"]; !ok {
		t.Error("ACCOUNT_CIPHER_KEYS should be described")
	}
}

func TestDescribeIgnoresProcessEnvironment(t *testing.T) {
	t.Setenv("SERVER_PORT", "9999")
	for _, v := range Describe() {
		if v.Name == "SERVER_PORT" && v.Default != "8080" {
			t.Fatalf("Describe leaked the process environment: default %q", v.Default)
		}
	}
}

func TestVarNotesReferenceRealVariables(t *testing.T) {
	known := map[string]bool{}
	for _, v := range Describe() {
		known[v.Name] = true
	}
	for name := range varNotes {
		if !known[name] {
			t.Errorf("varNotes names %s, which Load does not read", name)
		}
	}
}
