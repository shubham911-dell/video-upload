# -*- encoding: utf-8 -*-
# stub: google-protobuf 4.30.2 ruby lib
# stub: ext/google/protobuf_c/extconf.rb ext/google/protobuf_c/Rakefile

Gem::Specification.new do |s|
  s.name = "google-protobuf".freeze
  s.version = "4.30.2".freeze

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.metadata = { "source_code_uri" => "https://github.com/protocolbuffers/protobuf/tree/v4.30.2/ruby" } if s.respond_to? :metadata=
  s.require_paths = ["lib".freeze]
  s.authors = ["Protobuf Authors".freeze]
  s.date = "2025-03-26"
  s.description = "Protocol Buffers are Google's data interchange format.".freeze
  s.email = "protobuf@googlegroups.com".freeze
  s.extensions = ["ext/google/protobuf_c/extconf.rb".freeze, "ext/google/protobuf_c/Rakefile".freeze]
  s.files = ["ext/google/protobuf_c/Rakefile".freeze, "ext/google/protobuf_c/extconf.rb".freeze]
  s.homepage = "https://developers.google.com/protocol-buffers".freeze
  s.licenses = ["BSD-3-Clause".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 3.0".freeze)
  s.rubygems_version = "3.5.16".freeze
  s.summary = "Protocol Buffers".freeze

  s.installed_by_version = "3.6.8".freeze

  s.specification_version = 4

  s.add_development_dependency(%q<rake-compiler-dock>.freeze, ["= 1.2.1".freeze])
  s.add_runtime_dependency(%q<bigdecimal>.freeze, [">= 0".freeze])
  s.add_runtime_dependency(%q<rake>.freeze, [">= 13".freeze])
  s.add_development_dependency(%q<ffi>.freeze, ["~> 1".freeze])
  s.add_development_dependency(%q<ffi-compiler>.freeze, ["~> 1".freeze])
  s.add_development_dependency(%q<rake-compiler>.freeze, ["~> 1.1.0".freeze])
  s.add_development_dependency(%q<test-unit>.freeze, ["~> 3.0".freeze, ">= 3.0.9".freeze])
end
