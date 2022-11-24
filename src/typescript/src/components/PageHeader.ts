import Swal from "sweetalert2";
import { defineComponent, reactive, watch } from "vue";

import * as util from "@/modules/util";

export default defineComponent({
	computed: {
		hostnameTag(): string{
			switch(this.current_hostname_valid){
				case true:
					return "hostname-valid";
				case false:
					return "hostname-invalid";
				case null:
					return '';
			}
		},
		loggedIn(): boolean{
			return (
				this.current_user.api_key !== null &&
				this.current_user.username !== null
			);
		}
	},
	data(){
		return {
			current_hostname_valid: null as util.Nullable<boolean>,
			current_user: {
				api_key: null as util.Nullable<string>,
				username: null as util.Nullable<string>
			},
			view_location_options: reactive({
				active_graph: null as util.Nullable<util.View["graph"]>,
				hostname: '',
				username: '',
				series_name: '',
				onFileUploaded(_file: File){},
				onLoad(_hostname: string, _username: string, _series_name: string){},
				onSave(_hostname: string, _username: string, _api_key: string){},
				validateHost(_hostname: string): Promise<boolean>{
					return new Promise((resolve, _reject) => resolve(false));
				}
			})
		}
	},
	methods: {
		async attemptLogIn(){
			if(!await this.checkCurrentHostnameStatus()) return;

			Swal.fire({
				confirmButtonText: "Log in",
				html: '<input type="text" id="input-username" class="swal2-input" placeholder="Username"><input type="password" id="input-api-key" class="swal2-input" placeholder="API Key">',
				showCancelButton: true,
				title: "Log in",
				preConfirm(): {api_key: string, username: string} | undefined{
					let username = (Swal.getPopup()?.querySelector('#input-username') as util.Nullable<HTMLInputElement>)?.value;
					let api_key = (Swal.getPopup()?.querySelector('#input-api-key') as util.Nullable<HTMLInputElement>)?.value;

					let blank_fields: string[] = [];
					if(username === undefined || username.length == 0) blank_fields.push("username");
					if(api_key === undefined || api_key.length == 0) blank_fields.push("API key");

					if(blank_fields.length > 0){
						Swal.showValidationMessage(`Missing ${blank_fields.join(" and ")}`);
						return;
					}else{
						// `undefined` fields should have been caught by the `if`-clause
						return {
							api_key: api_key as string,
							username: username as string
						};
					}
				}
			}).then(result => {
				let username = result.value?.username;
				let api_key = result.value?.api_key;

				if(username === undefined || api_key === undefined) return;

				// The 'Authentication' header does not acknowledge terminal whitespace
				if(api_key.trim() !== api_key){
					Swal.showValidationMessage("Incorrect username or API key");
					this.current_user = {
						api_key: null,
						username: null
					};
					return;
				}

				let is_changing_user = this.loggedIn;

				fetch(`${window.view_location_options.hostname}/user/${username}`, {
					headers: {
						Authentication: api_key
					}
				}).then(response => {
					if(username === undefined || api_key === undefined) return;
					switch(response.status){
						case 204:
							util.toast.fire({
								icon: "success",
								title: `${is_changing_user ? "Changing to" : "Logged in as"} user: ${username}`
							});
							this.current_user = {api_key, username};
							break;
						case 401:
						case 404:
						default:
							this.current_user = {
								api_key: null,
								username: null
							};
							util.toast.fire({
								icon: "error",
								title: "Failed to log in: Incorrect username or API key"
							});
					}
				});
			});
		},
		async checkCurrentHostnameStatus(): Promise<boolean>{
			this.current_hostname_valid = await this.view_location_options.validateHost(this.view_location_options.hostname);
			return this.current_hostname_valid;
		},
		clearCurrentHostnameStatus(){
			this.current_hostname_valid = null;
		},
		createUser(){
			Swal.fire({
				confirmButtonText: "Create",
				html: '<input type="text" id="input-username" class="swal2-input" placeholder="Username">',
				showCancelButton: true,
				title: "Create User",
				preConfirm(): string{
					let username = (Swal.getPopup()?.querySelector('#input-username') as util.Nullable<HTMLInputElement>)?.value;

					if(username === undefined || username.length == 0){
						Swal.showValidationMessage(`Missing username`);
						return '';
					}else{
						// `undefined` fields should have been caught by the `if`-clause
						return username;
					}
				}
			}).then(username => fetch(`${window.view_location_options.hostname}/user/${username.value}`, {
					method: "PUT"
			})).then(async response => {
				switch(response.status){
					case 200:
					case 201:
						let json = await response.json() as {api_key: string, username: string};
						this.current_user = {
							api_key: json.api_key,
							username: json.username
						};
						Swal.fire({
							icon: "success",
							html: `<p>Username: ${this.current_user.username}</p><p>API Key: ${this.current_user.api_key}</p><br><p>Please remember this API key, it will not be shown again</p>`,
							title: "Created User"
						}).then(_result => {
							util.toast.fire({
								icon: "success",
								title: `Logged in as user: ${this.current_user.username}`
							})
						});
						break;
					case 403: // User exists
						this.current_user = {
							api_key: null,
							username: null
						};
						util.toast.fire({
							icon: "error",
							title: "Failed to create user: User exists"
						});
						break;
					default:
						this.current_user = {
							api_key: null,
							username: null
						};
						util.toast.fire({
							icon: "error",
							title: "Failed to create user"
						});
				}
			});
		},
		logOut(){
			if(!this.loggedIn) return;

			let username = this.current_user.username;

			this.current_user = {
				api_key: null,
				username: null
			};

			util.toast.fire({
				icon: "success",
				title: `Logged out of user: ${username}`
			});
		},
		requestLoad(){
			if(this.validateLocationInputs()) this.view_location_options.onLoad(
				this.view_location_options.hostname,
				this.view_location_options.username,
				this.view_location_options.series_name
			);
		},
		requestSave(){
			if(this.loggedIn && this.current_hostname_valid) this.view_location_options.onSave(
				this.view_location_options.hostname,
				// `this.loggedIn` will fail if current user fields were null
				this.current_user.username as string,
				this.current_user.api_key as string
			);
		},
		resize(...inputs: HTMLInputElement[]){
			for(let input of inputs){
				if(input.value === ''){
					input.value = input.placeholder;
					util.resizeInputWidth(input);
					input.value = '';
				}else{
					util.resizeInputWidth(input);
				}
			}
		},
		validateLocationInputs(): boolean{
			let {hostname, username, series_name} = this.view_location_options;

			let blank_parameters: string[] = [];
			if(hostname === '') blank_parameters.push("Hostname");
			if(username === '') blank_parameters.push("Username");
			if(series_name === '') blank_parameters.push("Series name");

			if(blank_parameters.length > 0){
				Swal.fire({
					icon: "warning",
					text: blank_parameters.join(", "),
					title: `The following parameter${
						(blank_parameters.length === 1)
							? " is"
							: "s are"
					} missing:`
				});

				return false;
			}else{
				return true;
			}
		}
	},
	mounted(){
		this.resize(
			this.$refs.input_hostname as HTMLInputElement,
			this.$refs.input_username as HTMLInputElement,
			this.$refs.input_series_name as HTMLInputElement
		);

		let unwatch = watch(this.view_location_options, () => {
			setTimeout(() => {
				this.resize(
					this.$refs.input_hostname as HTMLInputElement,
					this.$refs.input_username as HTMLInputElement,
					this.$refs.input_series_name as HTMLInputElement
				);

				this.checkCurrentHostnameStatus();
				unwatch();
			}, 1);
		});
	}
});
